import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';
import { z } from 'zod';
import type { Database, Transaction } from '@nextsignal/application';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { FixtureProvider } from '@nextsignal/adapters';
import { AbsProvider, PostgresAbsCache } from '@nextsignal/adapters/abs-provider';
import { LOCAL_OPPORTUNITY_EXAMPLE, SydneyAreaId } from '@nextsignal/contracts';
import { createInput } from '../../tests/helpers.js';

/** 用两个合成身份验证托管库的服务层和租户隔离，最后回滚所有测试数据。 */
export async function verifyHostedPersistence(client: Client) {
  await client.query('begin');
  let phase = 'isolating the queue';
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query('lock table public.jobs in share row exclusive mode');
    assert.equal((await client.query('select exists (select from public.jobs) as occupied')).rows[0]?.occupied, false, 'Smoke requires an empty queue');
    phase = 'assuming restricted application and worker roles';
    await client.query('grant kyb_app, kyb_worker to current_user');

    // Savepoints preserve separate role boundaries while allowing the entire smoke to roll back.
    /** 在保存点内临时切换 SQL 角色，并在结束时恢复身份。 */
    async function asRole<T>(role: 'kyb_app' | 'kyb_worker', work: () => Promise<T>) {
      await client.query('savepoint smoke_role');
      try {
        await client.query(`set local role ${role}`);
        const result = await work();
        await client.query('reset role');
        await client.query("select set_config('request.jwt.claim.sub', '', true)");
        await client.query('release savepoint smoke_role');
        return result;
      } catch (error) {
        await client.query('rollback to savepoint smoke_role');
        await client.query('release savepoint smoke_role');
        throw error;
      }
    }

    const tx: Transaction = { query: async <T>(sql: string, values?: unknown[]) => ({ rows: (await client.query(sql, values)).rows as T[] }) };
    const cache = new PostgresAbsCache(work => asRole('kyb_worker', () => work(tx)));
    let absRequests = 0;
    const abs = process.env.NEXTSIGNAL_ABS_VERIFY === '1' ? new AbsProvider(cache, (url, options) => {
      absRequests++;
      return fetch(url, options);
    }) : undefined;
    const db: Database = {
      asUser: (userId, work) => asRole('kyb_app', async () => {
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
        assert.equal((await client.query('select kyb_private.current_actor() as id')).rows[0]?.id, userId);
        return work(tx);
      }),
      claimJob: () => asRole('kyb_worker', async () => {
        const result = await client.query(`select id, workspace_id as "workspaceId", user_id as "userId", run_id as "runId",
          lease_token as "leaseToken", attempts from public.claim_fixture_job()`);
        return result.rows.length ? z.object({ id: z.uuid(), workspaceId: z.uuid(), userId: z.uuid(), runId: z.uuid(), leaseToken: z.uuid(), attempts: z.number().int() }).parse(result.rows[0]) : null;
      }),
    };
    /** 在当前回滚事务中创建测试用户及其工作区。 */
    async function actor() {
      const userId = randomUUID(), workspaceId = randomUUID();
      await client.query('insert into auth.users(id) values($1)', [userId]);
      await client.query('insert into public.workspaces(id,owner_id) values($1,$2)', [workspaceId,userId]);
      return { userId, workspaceId };
    }
    phase = 'creating synthetic identities and workspaces';
    const owner = await actor(), other = await actor();
    phase = 'running the project, profile and research services';
    const projects = new Projects(db);
    const id = await projects.create(owner, {
      ...createInput(), idea: LOCAL_OPPORTUNITY_EXAMPLE,
      localOpportunity: { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: SydneyAreaId.options, targetCustomer: 'Students and young professionals' },
    });
    const draft = (await projects.get(owner, id)).profiles[0]!;
    const profileId = await projects.confirm(owner, id, { profileId: draft.id, profile: draft.content, requestKey: randomUUID() });
    await projects.start(owner, id, { profileId, requestKey: randomUUID() });
    await new ResearchRunner(db, new FixtureProvider(), abs).processOne();
    const report = (await new Projects(db).get(owner, id)).reports[0];
    assert.ok(report?.synthetic);
    assert.equal(report.referenceProfile?.summary, LOCAL_OPPORTUNITY_EXAMPLE);
    assert.deepEqual(report.localOpportunity?.areas.map(area => area.id), SydneyAreaId.options);
    assert.equal(report.evidence.filter(item => item.classification === (abs ? 'VERIFIED_SOURCE' : 'RECORDED_SAMPLE')).length, 3);
    if (abs) {
      phase = 'checking live ABS values, provenance and shared cache';
      assert.deepEqual(report.evidence.filter(item => item.provider === 'abs').map(item => item.value), [8305, 18224, 25553]);
      assert.ok(report.evidence.filter(item => item.provider === 'abs').every(item => item.abs && item.citation && item.attribution));
      const before = absRequests;
      const cached = await abs.population([...SydneyAreaId.options].reverse(), AbortSignal.timeout(16_000));
      assert.equal(absRequests, before, 'Cache hit must not call ABS again');
      const cacheKey = await asRole('kyb_worker', async () => (await tx.query<{ cache_key: string }>(
        "select cache_key from kyb_private.abs_observation_cache where payload->>'sourceUrl'=$1 and collected_at=$2::timestamptz", [cached.sourceUrl, cached.collectedAt]
      )).rows[0]?.cache_key);
      assert.ok(cacheKey, 'The verified snapshot must exist in the shared cache');
      await asRole('kyb_worker', async () => {
        await tx.query("update kyb_private.abs_observation_cache set collected_at=now()-interval '8 days', expires_at=now()-interval '1 day' where cache_key=$1", [cacheKey]);
      });
      assert.equal(await cache.read(cacheKey), undefined, 'Expired entries must be skipped');
      console.log(`ABS hosted smoke used ${before} live HTTP requests before cache hit.`);
    }
    assert.equal(report.evidence.filter(item => item.classification === 'NOT_AVAILABLE' && item.value === null).length, 6);
    assert.deepEqual((await new Projects(db).get(owner, id)).reports[0], report);
    await assert.rejects(projects.get(other, id), /not_found/);
    await assert.rejects(projects.create({ userId: other.userId, workspaceId: owner.workspaceId }, {
      idea: 'Synthetic forged workspace smoke test', geography: { country: 'AU', granularity: 'national' },
      processingConsent: true, noticeVersion: 'local-fixture-v1', marketingOptIn: false, scenario: 'normal', requestKey: randomUUID(),
    }), { code: '42501' });
    phase = 'checking anonymous privileges';
    const anonymous = await client.query(`select has_table_privilege('anon', 'public.projects', 'SELECT') as projects,
      has_function_privilege('anon', 'public.claim_fixture_job()', 'EXECUTE') as claim`);
    assert.deepEqual(anonymous.rows[0], { projects: false, claim: false });
    const cachePrivileges = await client.query(`select has_table_privilege('anon', 'kyb_private.abs_observation_cache', 'SELECT') as anon,
      has_table_privilege('authenticated', 'kyb_private.abs_observation_cache', 'SELECT') as authenticated,
      has_table_privilege('kyb_app', 'kyb_private.abs_observation_cache', 'SELECT') as app`);
    assert.deepEqual(cachePrivileges.rows[0], { anon: false, authenticated: false, app: false });
    await asRole('kyb_app', async () => {
      assert.equal((await client.query('select kyb_private.current_actor() as actor')).rows[0]?.actor, null);
      assert.equal((await client.query('select id from public.projects')).rowCount, 0);
    });

    phase = 'checking conversation and export isolation';
    const conversation = randomUUID(), file = randomUUID();
    await assert.rejects(asRole('kyb_app', () => client.query('insert into public.conversations(workspace_id,project_id) values($1,$2)', [owner.workspaceId,id])), { code: '42501' });
    await client.query('insert into public.conversations(id,workspace_id,project_id) values($1,$2,$3)', [conversation,owner.workspaceId,id]);
    await client.query("insert into public.messages(workspace_id,conversation_id,role,content) values($1,$2,'user','Synthetic smoke message')", [owner.workspaceId,conversation]);
    await client.query(`insert into public.report_files(id,workspace_id,project_id,report_id,object_path,mime_type,size_bytes)
      values($1,$2,$3,$4,$5,'text/csv',10)`, [file,owner.workspaceId,id,report.id,`${owner.workspaceId}/${id}/${report.id}/${file}.csv`]);
    await client.query('savepoint smoke_fk');
    await assert.rejects(client.query('insert into public.conversations(workspace_id,project_id) values($1,$2)', [other.workspaceId,id]), { code: '23503' });
    await client.query('rollback to savepoint smoke_fk');
    for (const table of ['projects', 'conversations', 'messages', 'report_versions', 'report_files']) {
      /** 按指定身份统计当前表中 RLS 允许读取的行。 */
      const count = (userId: string) => db.asUser(userId, async scoped => (await scoped.query(`select id from public.${table}`)).rows.length);
      assert.equal(await count(owner.userId), 1);
      assert.equal(await count(other.userId), 0);
    }
  } catch (error) {
    const code = z.object({ code: z.string().regex(/^[A-Z0-9_]{1,50}$/) }).safeParse(error);
    const detail = error instanceof Error && /^(?:permission denied for (?:table|schema|function|sequence) [a-z_]+|new row violates row-level security policy for table "[a-z_]+")$/.test(error.message) ? ` ${error.message}.` : '';
    console.error(`Hosted smoke failed while ${phase}${code.success ? ` (${code.data.code})` : ''}.${detail}`);
    throw error;
  } finally {
    await client.query('rollback');
  }
  console.log('Hosted PostgreSQL smoke passed. Fixture project, job, report, conversation and file metadata verified. Test data and role grants rolled back.');
}
