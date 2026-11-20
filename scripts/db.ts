import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { readAdminConfig, readInspectorConfig } from '@nextsignal/adapters/local-config';
import { composeArguments, docker, startLocalPostgres } from './lib/local-postgres.js';

const root=process.cwd(),command=process.argv[2];
try{
  if(command==='up'){
    const local=await startLocalPostgres(root);await local.admin.end();
    console.log('Docker PostgreSQL ready at 127.0.0.1:54328 / next_signal_local. Run db:migrate for existing PGlite data.');
  }else if(command==='stop'){
    await docker([...composeArguments(root),'stop'],root);console.log('PostgreSQL stopped. Persistent volume preserved.');
  }else if(command==='shell'){
    await readInspectorConfig(root);
    const args=[...composeArguments(root),'exec',...(process.stdin.isTTY?[]:['-T']),'postgres','psql','-U','nextsignal_local_inspector','-d','next_signal_local',...process.argv.slice(3)];
    const child=spawn('docker',args,{stdio:'inherit',windowsHide:true});
    process.exitCode=await new Promise<number>((done,reject)=>{child.on('error',reject);child.on('exit',code=>done(code??1));});
  }else if(command==='schema'){
    const config=await readInspectorConfig(root),pool=new Pool({...config,connectionTimeoutMillis:5000});
    try{
      const rows=(await pool.query<{table_name:string;column_name:string;data_type:string;is_nullable:string;column_default:string|null}>("select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows;
      if(process.argv.includes('--write')){
        const lines=['# Local PostgreSQL public schema','', 'Generated from the running Docker PostgreSQL metadata. No customer rows or credentials are included. JSON document keys are defined separately in packages/contracts/src/index.ts.',''];
        for(const table of [...new Set(rows.map(r=>r.table_name))]){
          lines.push(`## public.${table}`,'','| Column | PostgreSQL type | Nullable | Default |','| --- | --- | --- | --- |');
          for(const row of rows.filter(r=>r.table_name===table))lines.push(`| ${row.column_name} | ${row.data_type} | ${row.is_nullable} | ${(row.column_default??'—').replaceAll('|','\\|')} |`);
          lines.push('');
        }
        await mkdir(resolve(root,'docs/database'),{recursive:true});
        await writeFile(resolve(root,'docs/database/SCHEMA.md'),lines.join('\n'));
        console.log('Schema metadata written to docs/database/SCHEMA.md.');
      }else console.table(rows);
    }finally{await pool.end();}
  }else if(command==='status'){
    const pool=new Pool({...await readAdminConfig(root),user:'postgres',connectionTimeoutMillis:5000});
    try{
      const server=(await pool.query('select current_database() as database,version() as version')).rows[0];
      const state=(await pool.query('select ready,source from local_fixture.runtime_state where id=true')).rows[0]??{ready:false};
      const receipts=(await pool.query('select source_hash,completed_at from local_fixture.import_history')).rows;
      console.log(JSON.stringify({server,state,receipts},null,2));
    }finally{await pool.end();}
  }else{throw new Error(`Unknown database command. Use up, stop, status, shell or schema. Root: ${resolve(root)}`);}
}catch(error){console.error(error instanceof Error?error.message:'Local database operation failed');process.exitCode=1;}
