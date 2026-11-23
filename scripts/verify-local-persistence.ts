import { randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import { readRuntimeConfig } from '@nextsignal/adapters/local-config';
import { openLocalRuntime } from '@nextsignal/adapters/local-postgres';
import { canonical } from '@nextsignal/adapters/local-import';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { FixtureProvider, LOCAL_ACCOUNTS } from '@nextsignal/adapters';
import { composeArguments, docker, prepareLocalRuntime, startLocalPostgres } from './lib/local-postgres.js';

const root=process.cwd(),actor=LOCAL_ACCOUNTS.alice;
const active=await new Promise<boolean>(done=>{const socket=createConnection({host:'127.0.0.1',port:4311});socket.once('connect',()=>{socket.destroy();done(true);});socket.once('error',()=>done(false));socket.setTimeout(1000,()=>{socket.destroy();done(true);});});
if(active)throw new Error('Stop the local worker before the controlled container persistence check.');
await prepareLocalRuntime(root);
let runtime:ReturnType<typeof openLocalRuntime>|undefined=openLocalRuntime(await readRuntimeConfig(root));
let id:string|undefined;
try{
  let projects=new Projects(runtime.db);
  id=await projects.create(actor,{idea:'Disposable fixture verifying Docker PostgreSQL volume persistence',geography:{country:'AU',granularity:'national'},processingConsent:true,noticeVersion:'local-fixture-v1',scenario:'normal',requestKey:randomUUID()});
  const draft=(await projects.get(actor,id)).profiles[0]!;
  const profileId=await projects.confirm(actor,id,{profileId:draft.id,profile:draft.content,requestKey:randomUUID()});
  await projects.start(actor,id,{profileId,requestKey:randomUUID()});
  await new ResearchRunner(runtime.db,new FixtureProvider()).processOne();
  const before=await projects.get(actor,id);
  if(before.reports.length!==1)throw new Error('Persistence fixture did not complete');
  await runtime.close();
  runtime=undefined;
  await docker([...composeArguments(root),'stop','postgres'],root);
  const restarted=await startLocalPostgres(root);await restarted.admin.end();
  runtime=openLocalRuntime(await readRuntimeConfig(root));projects=new Projects(runtime.db);
  const after=await projects.get(actor,id);
  if(canonical(after)!==canonical(before))throw new Error('Project or report changed across container stop/start');
  let denied=false;
  try{await projects.get(LOCAL_ACCOUNTS.bob,id);}catch{denied=true;}
  if(!denied)throw new Error('Tenant boundary failed after restart');
  console.log('Docker volume persistence, immutable report and post-restart tenant isolation: PASSED.');
}finally{
  if(runtime)try{if(id)await new Projects(runtime.db).delete(actor,id);}finally{await runtime.close();}
  else console.error('Persistence check interrupted before reconnection; original data remains in the Docker volume.');
}
