import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const Password=z.string().regex(/^[a-f0-9]{64}$/);
const Connection={host:z.literal('127.0.0.1'),port:z.literal(54328),database:z.literal('next_signal_local')};
export const AdminConfig=z.object({...Connection,password:Password}).strict();
export const RuntimeConfig=z.object({...Connection,backendPassword:Password,queuePassword:Password,identityPassword:Password}).strict();
export const InspectorConfig=z.object({...Connection,user:z.literal('kyb_local_inspector'),password:Password}).strict();
export type RuntimeConfig=z.infer<typeof RuntimeConfig>;
export const localDirectory=(root:string)=>resolve(root,'.local/postgres');
export async function readRuntimeConfig(root:string):Promise<RuntimeConfig> {
  return RuntimeConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'runtime.json'),'utf8')));
}
export async function readAdminConfig(root:string) {
  return AdminConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'admin.json'),'utf8')));
}
export async function readInspectorConfig(root:string) {
  return InspectorConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'inspector.json'),'utf8')));
}
export async function ensureLocalConfig(root:string) {
  const directory=localDirectory(root);
  await mkdir(directory,{recursive:true,mode:0o700});
  const connection={host:'127.0.0.1',port:54328,database:'next_signal_local'};
  const secret=()=>randomBytes(32).toString('hex');
  const files:[string,unknown][]=[
    ['admin.json',{...connection,password:secret()}],
    ['runtime.json',{...connection,backendPassword:secret(),queuePassword:secret(),identityPassword:secret()}],
    ['inspector.json',{...connection,user:'kyb_local_inspector',password:secret()}]
  ];
  for(const [name,value] of files) {
    try {await writeFile(resolve(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
    catch(error){if(!(typeof error==='object'&&error&&'code'in error&&error.code==='EEXIST'))throw error;}
  }
  const admin=await readAdminConfig(root);
  const runtime=await readRuntimeConfig(root);
  const inspector=await readInspectorConfig(root);
  await writeFile(resolve(directory,'docker.env'),`KYB_LOCAL_PG_PASSWORD=${admin.password}\n`,{mode:0o600});
  return {admin,runtime,inspector};
}
