import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Database, Transaction } from '@nextsignal/application';

export const LOCAL_ACCOUNTS = {
  alice: { userId: '00000000-0000-4000-8000-000000000001', workspaceId: '10000000-0000-4000-8000-000000000001' },
  bob: { userId: '00000000-0000-4000-8000-000000000002', workspaceId: '10000000-0000-4000-8000-000000000002' }
} as const;

export class FixtureDatabase implements Database {
  /** 保存用于测试的 PGlite 数据库实例。 */
  constructor(readonly engine: PGlite) {}
  /** 在 PGlite 事务内绑定用户身份并执行查询。 */
  async asUser<T>(userId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
    z.uuid().parse(userId);
    return this.engine.transaction(async tx => {
      await tx.exec('set local role kyb_app');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
      return work(tx);
    });
  }
  /** 使用 worker 角色领取一条 fixture 任务。 */
  async claimJob() {
    return this.engine.transaction(async tx => {
      await tx.exec('set local role kyb_worker');
      const result = await tx.query('select * from public.claim_fixture_job()');
      if (!result.rows.length) return null;
      const row = z.object({ id: z.uuid(), workspace_id: z.uuid(), user_id: z.uuid(), run_id: z.uuid(), lease_token: z.uuid(), attempts: z.number().int() }).parse(result.rows[0]);
      return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, runId: row.run_id, leaseToken: row.lease_token, attempts: row.attempts };
    });
  }
  /** 释放 PGlite 数据库实例。 */
  async close() { await this.engine.close(); }
}

/** 初始化测试或旧数据导入所需的 PGlite 数据库。 */
export async function openFixtureDatabase(path?: string): Promise<FixtureDatabase> {
  const engine = path ? new PGlite(path) : new PGlite();
  await engine.waitReady;
  const exists = await engine.query<{ present: string | null }>("select to_regclass('local_fixture.schema_migrations')::text as present");
  if (!exists.rows[0]?.present) {
    await engine.exec(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema local_fixture;
      revoke all on schema local_fixture from public;
      create table local_fixture.sessions(token_hash text primary key,user_id uuid not null references auth.users(id),account text not null,expires_at timestamptz not null);
      create table local_fixture.schema_migrations(version text primary key, checksum text not null, applied_at timestamptz not null default now());
    `);
  }
  try {
    const directory = new URL('../../../supabase/migrations/', import.meta.url);
    const names = (await readdir(directory)).filter(name => /^\d{12}_[a-z0-9_]+\.sql$/.test(name)).sort();
    if (names.length === 0) throw new Error('No schema migrations found');
    for (const name of names) {
      const version = name.slice(0, 12);
      const migration = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(migration).digest('hex');
      const previous = await engine.query<{ checksum: string }>('select checksum from local_fixture.schema_migrations where version=$1', [version]);
      if (previous.rows.length) {
        if (previous.rows[0]?.checksum !== checksum) throw new Error('Applied migration checksum mismatch. Add a migration or explicitly reset disposable local fixture data.');
      } else {
        await engine.transaction(async tx => {
          await tx.exec(migration.replace(/^(?:begin|commit);\r?$/gim, ''));
          await tx.query('insert into local_fixture.schema_migrations(version,checksum) values($1,$2)', [version, checksum]);
        });
      }
    }
    for (const actor of Object.values(LOCAL_ACCOUNTS)) {
      await engine.query('insert into auth.users(id) values($1) on conflict do nothing', [actor.userId]);
      await engine.query('insert into public.workspaces(id,owner_id) values($1,$2) on conflict do nothing', [actor.workspaceId, actor.userId]);
    }
  } catch (error) {
    await engine.close();
    throw error;
  }
  return new FixtureDatabase(engine);
}
