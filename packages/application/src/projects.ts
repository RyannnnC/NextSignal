import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ConfirmProfile, CreateProject, Profile, ProjectView, Run, StartRun, type Profile as ProfileType } from '@kyb/contracts';
import { DomainError } from '@kyb/domain';
import type { Actor, Database, Transaction } from './index.js';

const Previous = z.object({ id: z.uuid(), request_hash: z.string() });
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
async function projectExists(tx: Transaction, projectId: string): Promise<void> {
  // Serialize project mutations while allowing the worker's foreign-key KEY SHARE locks.
  const rows = await tx.query('select id from public.projects where id=$1 for no key update', [projectId]);
  if (!rows.rows.length) throw new DomainError('not_found', 404);
}
function replay(row: unknown, requestHash: string): string | null {
  if (!row) return null;
  const previous = Previous.parse(row);
  if (previous.request_hash !== requestHash) throw new DomainError('idempotency_conflict', 409);
  return previous.id;
}
async function audit(tx: Transaction, actor: Actor, action: string, subjectId: string) {
  await tx.query('insert into public.audit_events(workspace_id,action,subject_id) values($1,$2,$3)', [actor.workspaceId, action, subjectId]);
}

export class Projects {
  constructor(private readonly db: Database) {}
  async list(actor: Actor): Promise<string[]> {
    return this.db.asUser(actor.userId, async tx => {
      const result = await tx.query('select id from public.projects order by created_at desc');
      return z.array(z.object({ id: z.uuid() })).parse(result.rows).map(r => r.id);
    });
  }
  async create(actor: Actor, input: unknown): Promise<string> {
    const data = CreateProject.parse(input);
    const requestHash = hash(data);
    return this.db.asUser(actor.userId, async tx => {
      await tx.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [actor.workspaceId]);
      const previous = await tx.query('select id,request_hash from public.projects where workspace_id=$1 and request_key=$2', [actor.workspaceId, data.requestKey]);
      const existing = replay(previous.rows[0], requestHash);
      if (existing) return existing;
      const count = z.object({ n: z.number() }).parse((await tx.query('select count(*)::int as n from public.projects')).rows[0]);
      if (count.n >= 20) throw new DomainError('project_limit', 429);
      const id = randomUUID();
      await tx.query('insert into public.projects(id,workspace_id,idea,scenario,request_key,request_hash) values($1,$2,$3,$4,$5,$6)', [id, actor.workspaceId, data.idea, data.scenario, data.requestKey, requestHash]);
      const profile: ProfileType = Profile.parse({ summary: data.idea, customer: 'Unknown — please describe the intended customer', problem: 'Unknown — please describe the problem to solve', geography: data.geography, assumptions: ['The intended customer experiences this problem. This has not been researched.'] });
      await tx.query('insert into public.profile_versions(workspace_id,project_id,version,content,status,request_key,request_hash) values($1,$2,1,$3,$4,$5,$6)', [actor.workspaceId, id, profile, 'awaiting_confirmation', data.requestKey, requestHash]);
      await tx.query('insert into public.consent_events(workspace_id,project_id,notice_version,processing_consent,marketing_opt_in) values($1,$2,$3,true,$4)', [actor.workspaceId, id, data.noticeVersion, data.marketingOptIn]);
      await audit(tx, actor, 'project_created', id);
      return id;
    });
  }
  async get(actor: Actor, id: string): Promise<ProjectView> {
    z.uuid().parse(id);
    return this.db.asUser(actor.userId, async tx => {
      const result = await tx.query('select id,stage,scenario from public.projects where id=$1', [id]);
      if (!result.rows.length) throw new DomainError('not_found', 404);
      const project = z.object({ id: z.uuid(), stage: z.enum(['idea', 'launch', 'growth']), scenario: CreateProject.shape.scenario }).parse(result.rows[0]);
      const profiles = await tx.query('select id,version,status,content,created_at as "createdAt" from public.profile_versions where project_id=$1 order by version', [id]);
      const runs = await tx.query('select id,profile_id as "profileId",status,error_code as "errorCode",created_at as "createdAt" from public.research_runs where project_id=$1 order by created_at', [id]);
      const reports = await tx.query<{ payload: unknown }>('select payload from public.report_versions where project_id=$1 order by created_at', [id]);
      return ProjectView.parse({ ...project, profiles: profiles.rows.map(dateToISO), runs: runs.rows.map(dateToISO), reports: reports.rows.map(r => r.payload) });
    });
  }
  async confirm(actor: Actor, id: string, input: unknown): Promise<string> {
    z.uuid().parse(id);
    const data = ConfirmProfile.parse(input);
    const requestHash = hash(data);
    return this.db.asUser(actor.userId, async tx => {
      await projectExists(tx, id);
      const previous = await tx.query('select id,request_hash from public.profile_versions where project_id=$1 and request_key=$2', [id, data.requestKey]);
      const existing = replay(previous.rows[0], requestHash);
      if (existing) return existing;
      const current = z.object({ id: z.uuid(), version: z.number() }).parse((await tx.query('select id,version from public.profile_versions where project_id=$1 order by version desc limit 1', [id])).rows[0]);
      if (current.id !== data.profileId) throw new DomainError('stale_profile', 409);
      const profileId = randomUUID();
      await tx.query('insert into public.profile_versions(id,workspace_id,project_id,version,content,status,request_key,request_hash,confirmed_at) values($1,$2,$3,$4,$5,$6,$7,$8,now())', [profileId, actor.workspaceId, id, current.version + 1, data.profile, 'confirmed', data.requestKey, requestHash]);
      await audit(tx, actor, 'profile_confirmed', profileId);
      return profileId;
    });
  }
  async start(actor: Actor, id: string, input: unknown): Promise<string> {
    z.uuid().parse(id);
    const data = StartRun.parse(input);
    const requestHash = hash(data);
    return this.db.asUser(actor.userId, async tx => {
      await tx.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [actor.workspaceId]);
      await projectExists(tx, id);
      const previous = await tx.query('select id,request_hash from public.research_runs where project_id=$1 and request_key=$2', [id, data.requestKey]);
      const existing = replay(previous.rows[0], requestHash);
      if (existing) return existing;
      const current = z.object({ id: z.uuid(), status: z.string() }).parse((await tx.query('select id,status from public.profile_versions where project_id=$1 order by version desc limit 1', [id])).rows[0]);
      if (current.id !== data.profileId || current.status !== 'confirmed') throw new DomainError('confirmation_required', 409);
      const count = z.object({ n: z.number() }).parse((await tx.query("select count(*)::int as n from public.research_runs where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'")).rows[0]);
      if (count.n >= 10) throw new DomainError('daily_run_limit', 429);
      const runId = randomUUID();
      await tx.query('insert into public.research_runs(id,workspace_id,project_id,profile_id,request_key,request_hash,max_calls) values($1,$2,$3,$4,$5,$6,2)', [runId, actor.workspaceId, id, data.profileId, data.requestKey, requestHash]);
      await tx.query('insert into public.jobs(workspace_id,project_id,run_id) values($1,$2,$3)', [actor.workspaceId, id, runId]);
      await tx.query('insert into public.run_events(workspace_id,project_id,run_id,to_status) values($1,$2,$3,$4)', [actor.workspaceId, id, runId, 'queued']);
      await audit(tx, actor, 'run_requested', runId);
      return runId;
    });
  }
  async cancel(actor: Actor, id: string, runId: string): Promise<void> {
    z.uuid().parse(id); z.uuid().parse(runId);
    await this.db.asUser(actor.userId, async tx => {
      await projectExists(tx, id);
      // Match worker finalisation: job -> run. Locking the run first can deadlock.
      await tx.query('select id from public.jobs where project_id=$1 and run_id=$2 for update', [id, runId]);
      const row = (await tx.query('select id,profile_id as "profileId",status,error_code as "errorCode",created_at as "createdAt" from public.research_runs where project_id=$1 and id=$2 for update', [id, runId])).rows[0];
      if (!row) throw new DomainError('not_found', 404);
      const run = Run.parse(dateToISO(row));
      if (['completed', 'partial', 'failed', 'cancelled'].includes(run.status)) return;
      await tx.query("update public.research_runs set status='cancelled' where id=$1", [runId]);
      await tx.query("update public.jobs set status='cancelled',lease_token=null,lease_until=null where run_id=$1", [runId]);
      await tx.query('insert into public.run_events(workspace_id,project_id,run_id,from_status,to_status) values($1,$2,$3,$4,$5)', [actor.workspaceId, id, runId, run.status, 'cancelled']);
      await audit(tx, actor, 'run_cancelled', runId);
    });
  }
  async delete(actor: Actor, id: string): Promise<void> {
    z.uuid().parse(id);
    await this.db.asUser(actor.userId, async tx => {
      const owned = await tx.query('select id from public.projects where id=$1 for no key update', [id]);
      if (!owned.rows.length) return;
      // Drain in-flight writers before cascading through runs; do not hold a conflicting key lock.
      await tx.query('select id from public.jobs where project_id=$1 order by id for update', [id]);
      const result = await tx.query('delete from public.projects where id=$1 returning id', [id]);
      if (result.rows.length) {
        await tx.query("insert into public.deletion_requests(workspace_id,project_id,status) values($1,$2,'completed')", [actor.workspaceId, id]);
        await audit(tx, actor, 'project_deleted', id);
      }
    });
  }
}
function dateToISO(input: unknown): unknown {
  const row = z.record(z.string(), z.unknown()).parse(input);
  return { ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt };
}
