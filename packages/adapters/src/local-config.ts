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
/** 定位存放本地 PostgreSQL 配置的目录。 */
export const localDirectory=(root:string)=>resolve(root,'.local/postgres');
/** 加载并校验应用与 worker 的本地连接配置。 */
export async function readRuntimeConfig(root:string):Promise<RuntimeConfig> {
  return RuntimeConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'runtime.json'),'utf8')));
}
/** 读取迁移和启动使用的本地管理连接。 */
export async function readAdminConfig(root:string) {
  return AdminConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'admin.json'),'utf8')));
}
/** 读取本地只读数据库检查账号。 */
export async function readInspectorConfig(root:string) {
  return InspectorConfig.parse(JSON.parse(await readFile(resolve(localDirectory(root),'inspector.json'),'utf8')));
}
/** 生成缺失的本地配置并保留已有凭据。 */
export async function ensureLocalConfig(root:string) {
  const directory=localDirectory(root);
  await mkdir(directory,{recursive:true,mode:0o700});
  const connection={host:'127.0.0.1',port:54328,database:'next_signal_local'};
  /** 生成独立的随机本地凭据。 */
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
