import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { PostgresDatabase } from './postgres.js';
import { PostgresFixtureSessions } from './local-sessions.js';
import { LOCAL_ACCOUNTS } from './database.js';
import { type RuntimeConfig } from './local-config.js';

const sqlBody=(sql:string)=>sql.replace(/^(?:begin|commit);\r?$/gim,'');
export async function initializeLocalPostgres(admin:Pool,credentials:RuntimeConfig,inspectorPassword:string) {
  const client=await admin.connect();
  try {
    await client.query('begin');
    const name=(await client.query('select current_database() as name')).rows[0]?.name;
    if(name!=='next_signal_local')throw new Error('Refusing to bootstrap an unexpected database');
    await client.query("select pg_advisory_xact_lock(hashtextextended('kyb-local-bootstrap',0))");
    const localSql=await readFile(new URL('../../../supabase/local/0001_runtime.sql',import.meta.url),'utf8');
    const localHash=createHash('sha256').update(localSql).digest('hex');
    const exists=(await client.query("select to_regclass('local_fixture.runtime_migrations') as name")).rows[0]?.name;
    if(exists){
      const row=(await client.query('select checksum from local_fixture.runtime_migrations where version=$1',['0001'])).rows[0];
      if(row&&row.checksum!==localHash)throw new Error('Local runtime migration checksum mismatch');
    }
    await client.query(localSql);
    await client.query('insert into local_fixture.runtime_migrations(version,checksum) values($1,$2) on conflict do nothing',['0001',localHash]);
    const directory=new URL('../../../supabase/migrations/',import.meta.url);
    for(const file of (await readdir(directory)).filter(n=>/^\d{12}_[a-z0-9_]+\.sql$/.test(n)).sort()) {
      const sql=await readFile(new URL(file,directory),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
      const row=(await client.query('select checksum from local_fixture.schema_migrations where version=$1',[file.slice(0,12)])).rows[0];
      if(row){if(row.checksum!==hash)throw new Error(`Migration checksum mismatch: ${file}`);}
      else{await client.query(sqlBody(sql));await client.query('insert into local_fixture.schema_migrations(version,checksum) values($1,$2)',[file.slice(0,12),hash]);}
    }
    const passwords:Record<string,string>={kyb_local_backend:credentials.backendPassword,kyb_local_queue:credentials.queuePassword,kyb_local_identity:credentials.identityPassword,kyb_local_inspector:inspectorPassword};
    for(const [role,password] of Object.entries(passwords)){
      if(!/^[a-f0-9]{64}$/.test(password))throw new Error('Invalid local credential');
      if(!(await client.query('select 1 from pg_roles where rolname=$1',[role])).rows.length)await client.query(`create role ${role} login nosuperuser nobypassrls noinherit`);
      await client.query(`alter role ${role} password '${password}'`);
    }
    await client.query(`grant kyb_app to kyb_local_backend; grant kyb_worker to kyb_local_queue;
      grant usage on schema local_fixture to kyb_local_identity;
      grant select,insert,delete on local_fixture.sessions to kyb_local_identity;
      grant usage on schema public to kyb_local_inspector;
      grant select on all tables in schema public to kyb_local_inspector;`);
    await client.query('commit');
  } catch(error){await client.query('rollback');throw error;} finally{client.release();}
}
export async function seedLocalAccounts(client:PoolClient) {
  for(const actor of Object.values(LOCAL_ACCOUNTS)){
    await client.query('insert into auth.users(id) values($1) on conflict do nothing',[actor.userId]);
    await client.query('insert into public.workspaces(id,owner_id) values($1,$2) on conflict do nothing',[actor.workspaceId,actor.userId]);
  }
}
export function openLocalRuntime(config:RuntimeConfig) {
  const common={host:config.host,port:config.port,database:config.database,max:8,connectionTimeoutMillis:5000};
  const backend=new Pool({...common,user:'kyb_local_backend',password:config.backendPassword});
  const queue=new Pool({...common,user:'kyb_local_queue',password:config.queuePassword});
  const identity=new Pool({...common,user:'kyb_local_identity',password:config.identityPassword});
  for(const pool of [backend,queue,identity])pool.on('error',()=>console.error('Local PostgreSQL idle connection dropped; the pool will reconnect on demand.'));
  const db=new PostgresDatabase(backend,queue);
  return {db,sessions:new PostgresFixtureSessions(identity),close:async()=>{await db.close();await identity.end();}};
}
