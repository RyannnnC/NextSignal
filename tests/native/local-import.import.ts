import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { LOCAL_ACCOUNTS, FixtureProvider, openFixtureDatabase, type FixtureDatabase } from '@nextsignal/adapters';
import { initializeLocalPostgres } from '@nextsignal/adapters/local-postgres';
import { PostgresDatabase } from '@nextsignal/adapters/postgres';
import { PostgresFixtureSessions } from '@nextsignal/adapters/local-sessions';
import { exportSnapshot, importSnapshot, snapshotHash } from '@nextsignal/adapters/local-import';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { admin } from './setup.js';
import { prepared } from '../helpers.js';

const management=admin();
/** 为原生导入测试生成临时随机凭据。 */
const secret=()=>randomBytes(32).toString('hex');
const config={host:'127.0.0.1' as const,port:54328 as const,database:'next_signal_local' as const,backendPassword:secret(),queuePassword:secret(),identityPassword:secret()};
const port=Number(process.env.NEXTSIGNAL_TEST_PG_PORT??54329);
let target:Pool;
let source:FixtureDatabase;
let inspectorPassword:string;
beforeAll(async()=>{
  await management.query('create database next_signal_local');
  target=new Pool({host:'127.0.0.1',port,database:'next_signal_local',user:'postgres',password:process.env.NEXTSIGNAL_TEST_PG_PASSWORD,max:4});
  inspectorPassword=secret();
  await initializeLocalPostgres(target,config,inspectorPassword);
  source=await openFixtureDatabase();
});
afterAll(async()=>{if(source)await source.close();if(target)await target.end();await management.end();});

it('imports nonempty versioned fixture data atomically, verifies every table and supports replay',async()=>{
  const projects=new Projects(source),actor=LOCAL_ACCOUNTS.alice;
  const {id,profileId}=await prepared(projects,actor);
  await new ResearchRunner(source,new FixtureProvider()).processOne();
  const before=await projects.get(actor,id);
  const next=await projects.confirm(actor,id,{profileId,profile:{...before.profiles.at(-1)!.content,customer:'Migrated founder customer'},requestKey:randomUUID()});
  await projects.start(actor,id,{profileId:next,requestKey:randomUUID()});await new ResearchRunner(source,new FixtureProvider()).processOne();
  const snapshot=await exportSnapshot(source.engine),hash=snapshotHash(snapshot);
  const unrelated=randomUUID();await target.query('insert into auth.users(id) values($1)',[unrelated]);
  await expect(importSnapshot(target,snapshot)).rejects.toThrow('Target is not empty');
  await target.query('delete from auth.users where id=$1',[unrelated]);
  await expect(importSnapshot(target,snapshot,async()=>{throw new Error('injected precommit failure');})).rejects.toThrow('injected precommit failure');
  expect((await target.query('select id from public.projects')).rows).toHaveLength(0);
  expect((await target.query('select * from local_fixture.import_history')).rows).toHaveLength(0);
  const result=await importSnapshot(target,snapshot);
  expect(result.alreadyImported).toBe(false);expect(result.receipt.sourceHash).toBe(hash);
  expect(result.receipt.tables['public.report_versions']?.count).toBe(2);
  expect((await importSnapshot(target,snapshot)).alreadyImported).toBe(true);
  const altered=structuredClone(snapshot);altered.tables['public.projects'][0]!.idea='A changed source idea requiring explicit merge approval';
  await expect(importSnapshot(target,altered)).rejects.toThrow('different source');
  const connection={host:'127.0.0.1',port,database:'next_signal_local',max:4};
  const backend=new Pool({...connection,user:'kyb_local_backend',password:config.backendPassword});
  const queue=new Pool({...connection,user:'kyb_local_queue',password:config.queuePassword});
  const identity=new Pool({...connection,user:'kyb_local_identity',password:config.identityPassword});
  const db=new PostgresDatabase(backend,queue);
  const local={db,sessions:new PostgresFixtureSessions(identity),close:async()=>{await db.close();await identity.end();}};
  try{
    expect((await new Projects(local.db).get(actor,id)).reports).toEqual((await projects.get(actor,id)).reports);
    await expect(new Projects(local.db).get(LOCAL_ACCOUNTS.bob,id)).rejects.toThrow('not_found');
    const session=await local.sessions.create('alice');
    expect(await local.sessions.resolve(session.token)).toMatchObject({...actor,account:'alice'});
    const stored=(await target.query('select token_hash from local_fixture.sessions')).rows[0]?.token_hash;
    expect(stored).toBe(createHash('sha256').update(session.token).digest('hex'));expect(stored).not.toBe(session.token);
    await local.sessions.revoke(session.token);expect(await local.sessions.resolve(session.token)).toBeNull();
    await expect(local.db.asUser(actor.userId,tx=>tx.query('select * from local_fixture.sessions'))).rejects.toThrow('permission denied');
  }finally{await local.close();}
  const inspector=new Pool({host:'127.0.0.1',port,database:'next_signal_local',user:'kyb_local_inspector',password:inspectorPassword});
  try{
    expect((await inspector.query("select column_name from information_schema.columns where table_schema='public' and table_name='projects'")).rows.length).toBeGreaterThan(0);
    expect((await inspector.query('select * from public.projects')).rows).toHaveLength(0);
    await expect(inspector.query('delete from public.projects')).rejects.toThrow('permission denied');
  }finally{await inspector.end();}
});
