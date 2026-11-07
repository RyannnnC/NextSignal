import { cp, mkdir, open, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { exportSnapshot, importSnapshot } from '@kyb/adapters/local-import';
import { startLocalPostgres, exists } from './lib/local-postgres.js';

const root=process.cwd(),local=resolve(root,'.local'),source=resolve(local,'db');
function listening(port:number):Promise<boolean>{return new Promise(done=>{const s=createConnection({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();done(true);});s.once('error',()=>done(false));s.setTimeout(1000,()=>{s.destroy();done(true);});});}
async function treeHash(directory:string):Promise<string>{
  const hash=createHash('sha256');
  async function visit(path:string,relative:string){for(const name of (await readdir(path)).sort()){
    const absolute=resolve(path,name),item=await stat(absolute);hash.update(`${relative}/${name}\0`);
    if(item.isDirectory())await visit(absolute,`${relative}/${name}`);else hash.update(await readFile(absolute));
  }}
  await visit(directory,'');return hash.digest('hex');
}
await mkdir(local,{recursive:true,mode:0o700});
const lock=await open(resolve(local,'migration.lock'),'wx',0o600);
try{
  await lock.writeFile(String(process.pid));
  if(await listening(4311)||await listening(3000))throw new Error('Stop the local web and worker before migrating. No files were copied.');
  if(!await exists(resolve(source,'PG_VERSION')))throw new Error('No existing PGlite database found. Use npm run dev for a fresh database.');
  const id=`pglite-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`;
  const backup=resolve(local,'backups',id),working=resolve(backup,'export-work');
  await mkdir(backup,{recursive:true,mode:0o700});
  const before=await treeHash(source);
  await cp(source,resolve(backup,'pglite'),{recursive:true,errorOnExist:true,force:false,preserveTimestamps:true});
  if(await treeHash(source)!==before||await treeHash(resolve(backup,'pglite'))!==before)throw new Error('Source changed during backup. Refusing to migrate.');
  await cp(resolve(backup,'pglite'),working,{recursive:true,errorOnExist:true,force:false});
  const pg=new PGlite(working);await pg.waitReady;
  let snapshot;
  try{snapshot=await exportSnapshot(pg);}finally{await pg.close();}
  await writeFile(resolve(backup,'data.json'),JSON.stringify(snapshot),{mode:0o600});
  const native=await startLocalPostgres(root);
  try{
    const result=await importSnapshot(native.admin,snapshot,async()=>{if(await treeHash(source)!==before)throw new Error('Source changed before commit. Import rolled back.');});
    await writeFile(resolve(backup,'receipt.json'),JSON.stringify({...result,sourceTreeHash:before,backupDirectory:backup},null,2),{mode:0o600});
    console.log(JSON.stringify({alreadyImported:result.alreadyImported,backupDirectory:backup,tables:Object.fromEntries(Object.entries(result.receipt.tables).map(([name,value])=>[name,value.count])),sessionsMigrated:false},null,2));
  }finally{await native.admin.end();}
}catch(error){console.error(error instanceof Error?error.message:'Migration failed');process.exitCode=1;}
finally{await lock.close();await rm(resolve(local,'migration.lock'));}
