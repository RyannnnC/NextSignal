import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { ensureLocalConfig, localDirectory } from '@nextsignal/adapters/local-config';
import { initializeLocalPostgres, seedLocalAccounts } from '@nextsignal/adapters/local-postgres';

/** 判断本地路径当前是否可访问。 */
export async function exists(path:string){try{await access(path);return true;}catch{return false;}}
/** 构造固定本地数据库项目的 Docker Compose 参数。 */
export const composeArguments=(root:string)=>['compose','--env-file',resolve(localDirectory(root),'docker.env'),'-p','next-signal-local','-f',resolve(root,'docker/compose.local.yml')];
/** 执行带超时的 Docker 命令并返回输出。 */
export function docker(args:string[],root:string,timeout=30000):Promise<string>{
  return new Promise((done,reject)=>execFile('docker',args,{cwd:root,timeout,windowsHide:true,maxBuffer:1024*1024},(error,stdout,stderr)=>{
    if(error)reject(new Error(`Docker operation failed: ${stderr||error.message}`));else done(stdout);
  }));
}
/** 核对 Docker 引擎后启动并初始化本地 PostgreSQL。 */
export async function startLocalPostgres(root:string){
  const config=await ensureLocalConfig(root);
  const engine=await docker(['info','--format','{{.OSType}} {{.ServerVersion}}'],root,20000);
  if(!engine.startsWith('linux '))throw new Error('Healthy Docker Linux engine required. No PGlite fallback.');
  await docker([...composeArguments(root),'up','-d','--wait','--wait-timeout','45'],root,180000);
  const admin=new Pool({...config.admin,user:'postgres',max:2,connectionTimeoutMillis:5000});
  try{await initializeLocalPostgres(admin,config.runtime,config.inspector.password);}
  catch(error){await admin.end();throw error;}
  return {...config,admin};
}
/** 校验迁移状态并为全新本地库准备 fixture 用户。 */
export async function prepareLocalRuntime(root:string){
  if(await exists(resolve(root,'.local/migration.lock')))throw new Error('Local data migration is in progress. Stop and retry after it finishes.');
  const local=await startLocalPostgres(root);
  try{
    const state=(await local.admin.query('select ready from local_fixture.runtime_state where id=true')).rows[0];
    if(state?.ready)return;
    if(await exists(resolve(root,'.local/db/PG_VERSION')))throw new Error('Existing PGlite data needs explicit migration. Stop the app and run npm run db:migrate.');
    const client=await local.admin.connect();
    try{await client.query('begin');await seedLocalAccounts(client);await client.query("insert into local_fixture.runtime_state(id,ready,source) values(true,true,'fresh')");await client.query('commit');}
    catch(error){await client.query('rollback');throw error;}finally{client.release();}
  }finally{await local.admin.end();}
}
