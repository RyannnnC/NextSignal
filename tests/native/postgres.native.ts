import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Projects } from '@kyb/application/projects';
import { ResearchRunner } from '@kyb/application/runner';
import { FixtureProvider, LOCAL_ACCOUNTS } from '@kyb/adapters';
import type { Database, ResearchProvider } from '@kyb/application';
import { admin, bootstrap, database, migrations, pool } from './setup.js';
import { createInput, prepared } from '../helpers.js';

const root = admin();
const db = database();
const alice = LOCAL_ACCOUNTS.alice, bob = LOCAL_ACCOUNTS.bob;
const projects = new Projects(db);
const runner = new ResearchRunner(db, new FixtureProvider());
beforeAll(async () => { await bootstrap(root); });
afterEach(async () => { await root.query('truncate public.projects cascade; truncate public.audit_events,public.deletion_requests'); });
afterAll(async () => { await db.close(); await root.end(); });

describe('native PostgreSQL migration, roles and workers', () => {
  it('runs migrations on native PostgreSQL and exercises non-superuser/non-bypass RLS roles', async () => {
    const version = await root.query('select version() as version');
    expect(version.rows[0]?.version).toContain('PostgreSQL 17.');
    console.info('Native PostgreSQL:', version.rows[0]?.version);
    const identity = await db.asUser(alice.userId, tx => tx.query('select current_user as name,rolsuper,rolbypassrls from pg_roles where rolname=current_user'));
    expect(identity.rows).toEqual([{ name: 'kyb_app', rolsuper: false, rolbypassrls: false }]);
    const tables = await root.query("select relname,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname<>'provider_licenses'");
    expect(tables.rows.length).toBeGreaterThan(10);
    for (const row of tables.rows) expect(row).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
  });
  it('denies cross-tenant reads, writes, job access and report mutation using real SQL roles', async () => {
    const { id, runId } = await prepared(projects, alice); await runner.processOne();
    for (const table of ['projects','profile_versions','research_runs','jobs','run_events','evidence_records','report_versions','findings','action_items','consent_events','provider_calls','audit_events']) {
      expect((await db.asUser(bob.userId, tx => tx.query(`select * from public.${table}`))).rows).toEqual([]);
    }
    await expect(projects.get(bob, id)).rejects.toThrow('not_found');
    await expect(db.asUser(bob.userId, tx => tx.query('insert into public.projects(workspace_id,idea,scenario,request_key,request_hash) values($1,$2,$3,$4,$5)', [alice.workspaceId,'Forbidden cross tenant write','normal',randomUUID(),'test']))).rejects.toThrow('row-level security');
    await expect(db.asUser(bob.userId, tx => tx.query('insert into public.evidence_records(id,workspace_id,project_id,run_id,payload) values($1,$2,$3,$4,$5)', [randomUUID(),bob.workspaceId,id,runId,{ synthetic: true,provider:'fixture' }]))).rejects.toThrow('foreign key constraint');
    await expect(db.asUser(alice.userId, tx => tx.query('select * from public.claim_fixture_job()'))).rejects.toThrow('permission denied');
    await expect(db.asUser(alice.userId, tx => tx.query("update public.report_versions set payload='{}' where project_id=$1",[id]))).rejects.toThrow('immutable');
    await expect(db.asUser(alice.userId, tx => tx.query("set role postgres"))).rejects.toThrow('permission denied');
    const queue=pool('kyb_test_queue',process.env.KYB_TEST_ROLE_PASSWORD!);
    try { await expect(queue.query('select * from public.projects')).rejects.toThrow('permission denied'); }
    finally { await queue.end(); }
    await projects.delete(bob,id);
    expect((await projects.get(alice,id)).reports).toHaveLength(1);
  });
  it('serialises concurrent idempotent requests across independent PostgreSQL connections', async () => {
    const input = createInput();
    const ids = await Promise.all(Array.from({ length: 8 }, () => projects.create(alice,input)));
    expect(new Set(ids).size).toBe(1);
    const id=ids[0]!; const draft=(await projects.get(alice,id)).profiles[0]!;
    const confirm={profileId:draft.id,profile:draft.content,requestKey:randomUUID()};
    const profiles=await Promise.all(Array.from({length:8},()=>projects.confirm(alice,id,confirm)));
    expect(new Set(profiles).size).toBe(1);
    const request={profileId:profiles[0],requestKey:randomUUID()};
    const runs=await Promise.all(Array.from({length:8},()=>projects.start(alice,id,request)));
    expect(new Set(runs).size).toBe(1);
    await Promise.all(Array.from({length:4},()=>runner.processOne()));
    expect((await projects.get(alice,id)).reports).toHaveLength(1);
    expect((await root.query('select count(*)::int as n from public.provider_calls')).rows[0]?.n).toBe(1);
    const results=await Promise.all(Array.from({length:16},(_,i)=>db.asUser(i%2 ? alice.userId:bob.userId,tx=>tx.query('select owner_id from public.workspaces'))));
    results.forEach((r,i)=>expect(r.rows).toEqual([{owner_id:i%2 ? alice.userId:bob.userId}]));
  });
  it('skips a row locked by a different connection instead of blocking queue consumers', async () => {
    const first=await prepared(projects,alice); const second=await prepared(projects,bob);
    const lock=await root.connect();
    try {
      await lock.query('begin'); await lock.query('select id from public.jobs where run_id=$1 for update',[first.runId]);
      const claim=await db.claimJob(); expect(claim?.runId).toBe(second.runId);
    } finally { await lock.query('rollback'); lock.release(); }
  });
  it.each(['cancel','delete'] as const)('does not deadlock %s against a worker holding the job lease row', async action => {
    const {id,runId}=await prepared(projects,alice);
    let acquired!:()=>void, release!:()=>void;
    const jobLocked=new Promise<void>(r=>{acquired=r;});
    const barrier=new Promise<void>(r=>{release=r;});
    const sqlErrors:string[]=[];
    let cancelPid:number|undefined;
    const instrument=(worker:boolean):Database=>({
      claimJob:()=>db.claimJob(),
      asUser:(userId,work)=>db.asUser(userId,async tx=>{
        if(!worker) cancelPid=(await tx.query<{pid:number}>('select pg_backend_pid() as pid')).rows[0]!.pid;
        return work({query:async <T>(sql:string,parameters?:unknown[])=>{
          try {
            const result=await tx.query<T>(sql,parameters);
            if(worker&&sql.startsWith('select id from public.jobs where id=')){acquired();await barrier;}
            return result;
          } catch(error) {
            if(typeof error==='object'&&error&&'code' in error&&typeof error.code==='string') sqlErrors.push(error.code);
            throw error;
          }
        }});
      })
    });
    const processing=new ResearchRunner(instrument(true),new FixtureProvider()).processOne();
    await jobLocked;
    const service=new Projects(instrument(false));
    const cancellation=action==='cancel'?service.cancel(alice,id,runId):service.delete(alice,id);
    // Observe a genuine server-side lock wait rather than relying on arbitrary sleep ordering.
    let waiting=false;
    try {
      for(let i=0;i<200;i++) {
        if(cancelPid) waiting=(await root.query('select wait_event_type from pg_stat_activity where pid=$1',[cancelPid])).rows[0]?.wait_event_type==='Lock';
        if(waiting)break;
        await new Promise(r=>setTimeout(r,10));
      }
    } finally { release(); }
    const result=await Promise.allSettled([processing,cancellation]);
    expect(waiting).toBe(true);
    expect(sqlErrors).toEqual([]);
    expect(result.every(r=>r.status==='fulfilled')).toBe(true);
    if(action==='cancel') expect((await projects.get(alice,id)).runs[0]?.status).toMatch(/^(partial|cancelled)$/);
    else {
      await expect(projects.get(alice,id)).rejects.toThrow('not_found');
      expect((await root.query('select id from public.report_versions')).rows).toEqual([]);
    }
  });
  it('fences a stale worker after an expired lease is reclaimed by another connection', async () => {
    const {id,runId}=await prepared(projects,alice);
    let ready!:()=>void, release!:()=>void;
    const started=new Promise<void>(r=>{ready=r;}); const barrier=new Promise<void>(r=>{release=r;});
    const provider:ResearchProvider={name:'fixture',version:'native-barrier-v1',collect:async context=>{ready();await barrier;return new FixtureProvider().collect(context);}};
    const old=new ResearchRunner(db,provider).processOne(); await started;
    await root.query("update public.jobs set lease_until=now()-interval '1 second' where run_id=$1",[runId]);
    await runner.processOne(); release(); await old;
    expect((await projects.get(alice,id)).reports).toHaveLength(1);
  });
  it('runs four independent worker processes against a shared native queue without duplicate reports', async () => {
    for(let i=0;i<8;i++) await prepared(projects,i%2 ? alice:bob);
    const children=Array.from({length:4},()=>fork(resolve('tests/native/worker-process.ts'),[],{execArgv:['--import','tsx'],env:process.env,stdio:['ignore','ignore','inherit','ipc'],windowsHide:true}));
    try {
      await Promise.all(children.map(child=>new Promise<void>((done,reject)=>{
        child.on('message',m=>{if(m==='ready')done();}); child.once('error',reject);child.once('exit',code=>{if(code!==0)reject(new Error('Worker failed before readiness'));});
      })));
      const results=children.map(child=>new Promise<number>((done,reject)=>{
        let count=0;
        child.on('message',m=>{if(typeof m==='object'&&m&&'completed' in m&&typeof m.completed==='number')count=m.completed;});
        child.once('exit',code=>code===0?done(count):reject(new Error('Worker process failed')));
      }));
      children.forEach(child=>child.send('start'));
      const counts=await Promise.all(results);
      console.info('Native worker completed counts:',JSON.stringify(counts));
      expect(counts.reduce((a,b)=>a+b,0)).toBe(8); expect(counts.every(c=>c>0)).toBe(true);
      expect((await root.query('select count(*)::int as n from public.report_versions')).rows[0]?.n).toBe(8);
      expect((await root.query('select count(*)::int as n from public.provider_calls')).rows[0]?.n).toBe(8);
      expect((await root.query("select count(*)::int as n from public.research_runs where status='partial'")).rows[0]?.n).toBe(8);
    } finally { children.forEach(child=>{if(child.exitCode===null)child.kill();}); }
  });
  it('rolls migrations back in reverse order and reapplies them on native PostgreSQL', async () => {
    const files=(await readdir('supabase/rollback')).filter(n=>n.endsWith('.sql')).sort().reverse();
    for(const file of files) await root.query(await readFile(`supabase/rollback/${file}`,'utf8'));
    expect((await root.query("select to_regclass('public.projects') as table_name")).rows[0]?.table_name).toBeNull();
    await migrations(root);
    // Recreate harness-only memberships/seed rows lost when the application schema/roles were dropped.
    await root.query('grant kyb_app to kyb_test_backend; grant kyb_worker to kyb_test_queue');
    for(const actor of [alice,bob]) await root.query('insert into public.workspaces(id,owner_id) values($1,$2)',[actor.workspaceId,actor.userId]);
    const {id}=await prepared(projects,alice);
    await runner.processOne();
    expect((await projects.get(alice,id)).reports).toHaveLength(1);
    await expect(projects.get(bob,id)).rejects.toThrow('not_found');
  });
});
