import { readFile, readdir } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import { PostgresDatabase } from './postgres.js';
import { PostgresFixtureSessions } from './local-sessions.js';
import { LOCAL_ACCOUNTS } from './database.js';
import { type RuntimeConfig } from './local-config.js';
import { hasNamingCutover, matchesMigration, migrationChecksum } from './migration-history.js';

/** 移除迁移文件的事务边界，由外层统一提交。 */
const sqlBody=(sql:string)=>sql.replace(/^(?:begin|commit);\r?$/gim,'');
/** 校验本地目标与迁移历史，再初始化数据库和角色。 */
export async function initializeLocalPostgres(admin:Pool,credentials:RuntimeConfig,inspectorPassword:string) {
  const client=await admin.connect();
  try {
    await client.query('begin');
    const name=(await client.query('select current_database() as name')).rows[0]?.name;
    if(name!=='next_signal_local')throw new Error('Refusing to bootstrap an unexpected database');
    // Keep the original PostgreSQL hash key as an interlock with earlier revisions.
    await client.query('select pg_advisory_xact_lock($1::bigint)', ['3765245598099079016']);
    await client.query("select pg_advisory_xact_lock(hashtextextended('nextsignal-local-bootstrap',0))");
    const cutover = await hasNamingCutover(client, 'fixture');
    const localSql=await readFile(new URL('../../../supabase/local/0001_runtime.sql',import.meta.url),'utf8');
    const exists=(await client.query("select to_regclass('local_fixture.runtime_migrations') as name")).rows[0]?.name;
    const runtime = exists ? (await client.query('select checksum from local_fixture.runtime_migrations where version=$1',['0001'])).rows[0] : undefined;
    if (runtime) {
      if (!matchesMigration('local/0001_runtime.sql', localSql, runtime.checksum, cutover)) throw new Error('Local runtime migration checksum mismatch');
    } else {
      await client.query(localSql);
      await client.query('insert into local_fixture.runtime_migrations(version,checksum) values($1,$2)', ['0001', migrationChecksum(localSql)]);
    }
    const directory=new URL('../../../supabase/migrations/',import.meta.url);
    for(const file of (await readdir(directory)).filter(n=>/^\d{12}_[a-z0-9_]+\.sql$/.test(n)).sort()) {
      const sql=await readFile(new URL(file,directory),'utf8');
      const row=(await client.query('select checksum from local_fixture.schema_migrations where version=$1',[file.slice(0,12)])).rows[0];
      if(row){if(!matchesMigration(`migrations/${file}`, sql, row.checksum, cutover))throw new Error(`Migration checksum mismatch: ${file}`);}
      else{await client.query(sqlBody(sql));await client.query('insert into local_fixture.schema_migrations(version,checksum) values($1,$2)',[file.slice(0,12),migrationChecksum(sql)]);}
    }
    const passwords:Record<string,string>={nextsignal_local_backend:credentials.backendPassword,nextsignal_local_queue:credentials.queuePassword,nextsignal_local_identity:credentials.identityPassword,nextsignal_local_inspector:inspectorPassword};
    for(const [role,password] of Object.entries(passwords)){
      if(!/^[a-f0-9]{64}$/.test(password))throw new Error('Invalid local credential');
      if(!(await client.query('select 1 from pg_roles where rolname=$1',[role])).rows.length)await client.query(`create role ${role} login nosuperuser nobypassrls noinherit`);
      await client.query(`alter role ${role} password '${password}'`);
    }
    await client.query(`grant nextsignal_app to nextsignal_local_backend; grant nextsignal_worker to nextsignal_local_queue;
      grant usage on schema local_fixture to nextsignal_local_identity;
      grant select,insert,delete on local_fixture.sessions to nextsignal_local_identity;
      grant usage on schema public to nextsignal_local_inspector;
      grant select on all tables in schema public to nextsignal_local_inspector;`);
    await client.query('commit');
  } catch(error){await client.query('rollback');throw error;} finally{client.release();}
}
/** 幂等创建本地 fixture 用户与工作区。 */
export async function seedLocalAccounts(client:PoolClient) {
  for(const actor of Object.values(LOCAL_ACCOUNTS)){
    await client.query('insert into auth.users(id) values($1) on conflict do nothing',[actor.userId]);
    await client.query('insert into public.workspaces(id,owner_id) values($1,$2) on conflict do nothing',[actor.workspaceId,actor.userId]);
  }
}
/** 为应用、任务队列和会话打开分权连接。 */
export function openLocalRuntime(config:RuntimeConfig) {
  const common={host:config.host,port:config.port,database:config.database,max:8,connectionTimeoutMillis:5000};
  const backend=new Pool({...common,user:'nextsignal_local_backend',password:config.backendPassword});
  const queue=new Pool({...common,user:'nextsignal_local_queue',password:config.queuePassword});
  const identity=new Pool({...common,user:'nextsignal_local_identity',password:config.identityPassword});
  for(const pool of [backend,queue,identity])pool.on('error',()=>console.error('Local PostgreSQL idle connection dropped; the pool will reconnect on demand.'));
  const db=new PostgresDatabase(backend,queue);
  return {db,sessions:new PostgresFixtureSessions(identity),close:async()=>{await db.close();await identity.end();}};
}
