import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FixtureProvider, LOCAL_ACCOUNTS, openFixtureDatabase, type FixtureDatabase } from '@nextsignal/adapters';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { validateReport } from '@nextsignal/domain';
import type { ResearchProvider } from '@nextsignal/application';
import { createInput, prepared } from './helpers.js';

const alice = LOCAL_ACCOUNTS.alice;
const bob = LOCAL_ACCOUNTS.bob;
let db: FixtureDatabase;
let projects: Projects;
let runner: ResearchRunner;
beforeAll(async () => { db = await openFixtureDatabase(); projects = new Projects(db); runner = new ResearchRunner(db, new FixtureProvider()); });
afterEach(async () => { await db.engine.exec('truncate public.projects cascade; truncate public.audit_events,public.deletion_requests'); });
afterAll(async () => { if (db) await db.close(); });

describe('persisted fixture vertical slice', () => {
  it('requires confirmation, preserves corrections and produces a private versioned snapshot', async () => {
    const id = await projects.create(alice, createInput());
    const draft = (await projects.get(alice, id)).profiles[0]!;
    await expect(projects.start(alice, id, { profileId: draft.id, requestKey: randomUUID() })).rejects.toThrow('confirmation_required');
    const profileId = await projects.confirm(alice, id, { profileId: draft.id, profile: { ...draft.content, customer: 'Confirmed target customer' }, requestKey: randomUUID() });
    await projects.start(alice, id, { profileId, requestKey: randomUUID() });
    expect(await runner.processOne()).toBe(true);
    const first = await projects.get(alice, id);
    expect(first.profiles).toHaveLength(2);
    expect(first.runs[0]?.status).toBe('partial');
    expect(first.reports[0]?.synthetic).toBe(true);
    expect(first.reports[0]?.profileId).toBe(profileId);
    expect(first.reports[0]?.evidence[0]?.value).toBeNull();
    expect(first.reports[0]?.actions.map(a => a.priority)).toEqual([1, 2, 3]);
    const secondProfile = await projects.confirm(alice, id, { profileId, profile: { ...first.profiles[1]!.content, customer: 'Corrected target customer' }, requestKey: randomUUID() });
    await projects.start(alice, id, { profileId: secondProfile, requestKey: randomUUID() });
    await runner.processOne();
    const second = await projects.get(alice, id);
    expect(second.reports).toHaveLength(2);
    expect(second.reports[0]).toEqual(first.reports[0]);
    expect(new Set(second.reports.map(r => r.profileId)).size).toBe(2);
    expect(await runner.processOne()).toBe(false);
  });
  it('deduplicates concurrent requests and rejects altered payloads reusing keys', async () => {
    const input = createInput();
    const ids = await Promise.all([projects.create(alice, input), projects.create(alice, input)]);
    expect(ids[0]).toBe(ids[1]);
    await expect(projects.create(alice, { ...input, idea: 'A different idea with the same idempotency key' })).rejects.toThrow('idempotency_conflict');
    const id = ids[0]!; const draft = (await projects.get(alice, id)).profiles[0]!;
    const confirmation = { profileId: draft.id, profile: draft.content, requestKey: randomUUID() };
    const profileId = await projects.confirm(alice, id, confirmation);
    expect(await projects.confirm(alice, id, confirmation)).toBe(profileId);
    const request = { profileId, requestKey: randomUUID() };
    const runs = await Promise.all([projects.start(alice, id, request), projects.start(alice, id, request)]);
    expect(runs[0]).toBe(runs[1]);
    await Promise.all([runner.processOne(), runner.processOne()]);
    expect((await projects.get(alice, id)).reports).toHaveLength(1);
  });
  it('rejects stale profile confirmation and old profile research after a correction', async () => {
    const { id, profileId } = await prepared(projects, alice);
    const view = await projects.get(alice, id);
    const draft = view.profiles[0]!;
    await expect(projects.confirm(alice, id, { profileId: draft.id, profile: draft.content, requestKey: randomUUID() })).rejects.toThrow('stale_profile');
    await projects.confirm(alice, id, { profileId, profile: view.profiles.at(-1)!.content, requestKey: randomUUID() });
    await expect(projects.start(alice, id, { profileId, requestKey: randomUUID() })).rejects.toThrow('confirmation_required');
  });
  it.each(['missing', 'contradictory'] as const)('preserves %s evidence and unknowns', async scenario => {
    const { id } = await prepared(projects, alice, scenario);
    await runner.processOne();
    const report = (await projects.get(alice, id)).reports[0]!;
    if (scenario === 'missing') expect(report.evidence).toHaveLength(0);
    else { expect(report.findings[0]?.counterEvidenceIds).toHaveLength(1); expect(report.evidence.some(e => e.stale)).toBe(true); }
  });
  it.each(['timeout', 'malformed', 'quota'] as const)('bounds retries and preserves %s failure', async scenario => {
    const { id, runId } = await prepared(projects, alice, scenario);
    await runner.processOne();
    await db.engine.query('update public.jobs set available_at=now() where run_id=$1', [runId]);
    await runner.processOne();
    expect(await runner.processOne()).toBe(false);
    const view = await projects.get(alice, id);
    expect(view.runs[0]?.status).toBe('failed');
    expect(view.reports).toHaveLength(0);
    const counts = await db.engine.query<{ calls_used: number }>('select calls_used from public.research_runs where id=$1', [runId]);
    expect(counts.rows[0]?.calls_used).toBe(scenario === 'quota' ? 1 : 2);
  });
  it('stops before dispatch when the run budget is exhausted', async () => {
    const { id, runId } = await prepared(projects, alice);
    await db.engine.query('update public.research_runs set max_calls=0 where id=$1', [runId]);
    const provider: ResearchProvider = { name: 'fixture', version: 'test', collect: vi.fn(async () => []) };
    await new ResearchRunner(db, provider).processOne();
    expect(provider.collect).not.toHaveBeenCalled();
    expect((await projects.get(alice, id)).runs[0]?.errorCode).toBe('budget_exceeded');
  });
  it('applies per-account daily limits before enqueueing', async () => {
    const { id, profileId } = await prepared(projects, alice);
    for (let i = 0; i < 9; i++) await projects.start(alice, id, { profileId, requestKey: randomUUID() });
    await expect(projects.start(alice, id, { profileId, requestKey: randomUUID() })).rejects.toThrow('daily_run_limit');
  });
  it('cancels queued work idempotently', async () => {
    const { id, runId } = await prepared(projects, alice);
    await projects.cancel(alice, id, runId); await projects.cancel(alice, id, runId);
    expect(await runner.processOne()).toBe(false);
    expect((await projects.get(alice, id)).runs[0]?.status).toBe('cancelled');
  });
  it.each(['cancel', 'delete'] as const)('does not publish after in-flight %s', async action => {
    const { id, runId } = await prepared(projects, alice);
    let release!: () => void; let started!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    const provider: ResearchProvider = { name: 'fixture', version: 'test', collect: async context => { started(); await barrier; return new FixtureProvider().collect(context); } };
    const processing = new ResearchRunner(db, provider).processOne();
    await ready;
    if (action === 'cancel') await projects.cancel(alice, id, runId); else await projects.delete(alice, id);
    release(); await processing;
    expect((await db.engine.query('select id from public.report_versions')).rows).toHaveLength(0);
    if (action === 'cancel') expect((await projects.get(alice, id)).runs[0]?.status).toBe('cancelled');
    else await expect(projects.get(alice, id)).rejects.toThrow('not_found');
  });
  it('reclaims an expired lease without duplicating a report', async () => {
    const { id } = await prepared(projects, alice);
    const job = await db.claimJob(); expect(job).not.toBeNull();
    await db.engine.query("update public.jobs set lease_until=now()-interval '1 second' where id=$1", [job!.id]);
    await runner.processOne();
    expect((await projects.get(alice, id)).reports).toHaveLength(1);
  });
  it('reaps a crash after the final allowed attempt instead of stranding the run', async () => {
    const { id, runId } = await prepared(projects, alice);
    await db.engine.query("update public.jobs set status='running',attempts=2,lease_token=gen_random_uuid(),lease_until=now()-interval '1 second' where run_id=$1", [runId]);
    expect(await runner.processOne()).toBe(false);
    expect((await projects.get(alice, id)).runs[0]).toMatchObject({ status: 'failed', errorCode: 'retry_exhausted' });
  });
  it('makes no outbound network request during fixture research', async () => {
    const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disabled in this test'));
    try {
      const { id } = await prepared(projects, alice); await runner.processOne();
      expect((await projects.get(alice, id)).reports).toHaveLength(1);
      expect(outbound).not.toHaveBeenCalled();
    } finally { outbound.mockRestore(); }
  });
  it('deletes input, profile, evidence, consent, jobs and report payloads', async () => {
    const { id } = await prepared(projects, alice); await runner.processOne();
    await projects.delete(alice, id); await projects.delete(alice, id);
    for (const table of ['projects', 'profile_versions', 'research_runs', 'jobs', 'consent_events', 'evidence_records', 'findings', 'finding_evidence_links', 'action_items', 'provider_calls', 'run_events', 'report_versions']) expect((await db.engine.query(`select * from public.${table}`)).rows).toHaveLength(0);
    expect((await db.engine.query('select status from public.deletion_requests')).rows).toEqual([{ status: 'completed' }]);
  });
});

describe('SQL permissions and evidence integrity', () => {
  it('enables and forces RLS on every customer table and prevents cross-tenant reads/writes', async () => {
    const { id, runId } = await prepared(projects, alice); await runner.processOne();
    expect(await projects.list(bob)).toEqual([]);
    await expect(projects.get(bob, id)).rejects.toThrow('not_found');
    await expect(projects.cancel(bob, id, runId)).rejects.toThrow('not_found');
    await projects.delete(bob, id);
    expect((await projects.get(alice, id)).reports).toHaveLength(1);
    const tables = ['workspaces','projects','profile_versions','research_runs','jobs','run_events','provider_calls','evidence_records','findings','finding_evidence_links','action_items','report_versions','consent_events','audit_events','deletion_requests'];
    for (const table of tables) {
      const flags = await db.engine.query('select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass', [`public.${table}`]);
      expect(flags.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      if (table !== 'workspaces') expect(await db.asUser(bob.userId, async tx => (await tx.query(`select * from public.${table}`)).rows)).toHaveLength(0);
    }
    await expect(db.asUser(bob.userId, tx => tx.query('insert into public.projects(workspace_id,idea,scenario,request_key,request_hash) values($1,$2,$3,$4,$5)', [alice.workspaceId, 'Cross tenant insertion', 'normal', randomUUID(), 'test']))).rejects.toThrow();
    await expect(db.asUser(bob.userId, tx => tx.query('insert into public.evidence_records(id,workspace_id,project_id,run_id,payload) values($1,$2,$3,$4,$5)', [randomUUID(), bob.workspaceId, id, runId, { synthetic: true, provider: 'fixture' }]))).rejects.toThrow('foreign key constraint');
  });
  it('has no anonymous access and the queue worker cannot read tenant tables', async () => {
    await expect(db.engine.transaction(async tx => { await tx.exec('set local role nextsignal_worker'); return tx.query('select * from public.projects'); })).rejects.toThrow('permission denied');
    await expect(db.asUser('00000000-0000-4000-8000-000000000099', tx => tx.query('select * from public.workspaces'))).resolves.toMatchObject({ rows: [] });
    await expect(db.asUser(alice.userId, tx => tx.query('select * from local_fixture.sessions'))).rejects.toThrow('permission denied');
    await expect(db.asUser(alice.userId, tx => tx.query('select * from public.claim_fixture_job()'))).rejects.toThrow('permission denied');
  });
  it('prevents confirmed profile and report mutation at database level', async () => {
    const { id } = await prepared(projects, alice); await runner.processOne();
    await expect(db.asUser(alice.userId, tx => tx.query("update public.report_versions set payload='{}' where project_id=$1", [id]))).rejects.toThrow('immutable');
    await expect(db.asUser(alice.userId, tx => tx.query("update public.profile_versions set content='{}' where project_id=$1", [id]))).rejects.toThrow('immutable');
  });
  it('rejects cross-run references, missing references and ungrounded numeric claims', async () => {
    const { id } = await prepared(projects, alice); await runner.processOne();
    const report = (await projects.get(alice, id)).reports[0]!;
    const crossScope = structuredClone(report); crossScope.evidence[0]!.workspaceId = bob.workspaceId;
    expect(() => validateReport(crossScope)).toThrow('invalid_evidence_scope');
    const missing = structuredClone(report); missing.findings[0]!.evidenceIds = [randomUUID()];
    expect(() => validateReport(missing)).toThrow('missing_evidence');
    const numeric = structuredClone(report); numeric.findings[0]!.numeric = { evidenceId: report.evidence[0]!.id, value: 5000, unit: 'searches/month', geography: report.geography, observedPeriod: { from: report.createdAt, to: report.createdAt } };
    expect(() => validateReport(numeric)).toThrow('ungrounded_numeric_claim');
  });
  it('keeps all real providers blocked with no API configuration', async () => {
    const rows = await db.engine.query('select provider,decision from public.provider_licenses where provider<>$1 order by provider', ['fixture']);
    expect(rows.rows).toEqual(['abs','answerthepublic','dataforseo'].map(provider => ({ provider, decision: 'BLOCKED' })));
  });
  it('can roll back and reapply the local initial migration', async () => {
    const isolated = await openFixtureDatabase();
    try {
      await isolated.engine.exec(await readFile(new URL('../supabase/rollback/202610270002_lease_exhaustion.sql', import.meta.url), 'utf8'));
      await isolated.engine.exec(await readFile(new URL('../supabase/rollback/202610270001_m1.sql', import.meta.url), 'utf8'));
      await isolated.engine.exec(await readFile(new URL('../supabase/migrations/202610270001_m1.sql', import.meta.url), 'utf8'));
      await isolated.engine.exec(await readFile(new URL('../supabase/migrations/202610270002_lease_exhaustion.sql', import.meta.url), 'utf8'));
      expect((await isolated.engine.query('select * from public.projects')).rows).toEqual([]);
    } finally { await isolated.close(); }
  });
});
