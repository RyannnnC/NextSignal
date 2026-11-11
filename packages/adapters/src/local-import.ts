import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Pool } from 'pg';
import type { PGlite } from '@electric-sql/pglite';
import { Profile, Evidence, Report } from '@nextsignal/contracts';

export const DATA_TABLES=[
  'auth.users','public.workspaces','public.projects','public.profile_versions','public.consent_events',
  'public.research_runs','public.jobs','public.run_events','public.provider_calls','public.evidence_records',
  'public.findings','public.finding_evidence_links','public.action_items','public.report_versions',
  'public.audit_events','public.deletion_requests','public.provider_licenses'
] as const;
const Row=z.record(z.string(),z.json());
const Tables=z.object(Object.fromEntries(DATA_TABLES.map(name=>[name,z.array(Row)])) as Record<(typeof DATA_TABLES)[number],z.ZodArray<typeof Row>>).strict();
export const Snapshot=z.object({version:z.literal(1),tables:Tables}).strict();
export type Snapshot=z.infer<typeof Snapshot>;
/** 稳定序列化对象和数组，便于迁移前后比较。 */
export function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** 按行内容计算与顺序无关的表校验值。 */
export function tableHash(rows:unknown[]):string{return createHash('sha256').update(canonical(rows.map(canonical).sort())).digest('hex');}
/** 计算完整导入快照的校验值。 */
export function snapshotHash(snapshot:Snapshot):string{return createHash('sha256').update(canonical(snapshot)).digest('hex');}
/** 在同一事务中读取旧 PGlite 数据及各表校验值。 */
export async function exportSnapshot(source:PGlite):Promise<Snapshot>{
  return source.transaction(async tx=>{
    await tx.exec("set local timezone='UTC'; set transaction read only");
    const tables:Record<string,unknown[]>={};
    for(const table of DATA_TABLES){
      const result=await tx.query<{row:unknown}>(`select to_jsonb(t) as row from ${table} t`);
      tables[table]=result.rows.map(r=>r.row).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
    }
    const snapshot=Snapshot.parse({version:1,tables});
    for(const row of snapshot.tables['public.profile_versions'])Profile.parse(row.content);
    for(const row of snapshot.tables['public.evidence_records'])Evidence.parse(row.payload);
    for(const row of snapshot.tables['public.report_versions'])Report.parse(row.payload);
    const policies=snapshot.tables['public.provider_licenses'];
    if(policies.length!==4||policies.some(p=>p.provider==='fixture'?p.decision!=='APPROVED_LOCAL':p.decision!=='BLOCKED'))throw new Error('Source provider policy requires review before import');
    return snapshot;
  });
}
export const Receipt=z.object({sourceHash:z.string().length(64),tables:z.record(z.string(),z.object({count:z.number().int().nonnegative(),sha256:z.string().length(64)})),sessionsMigrated:z.literal(false)}).strict();
export type Receipt=z.infer<typeof Receipt>;
/** 原子导入已校验的快照，并在提交前核对结果。 */
export async function importSnapshot(pool:Pool,input:unknown,beforeCommit?:()=>Promise<void>):Promise<{alreadyImported:boolean;receipt:Receipt}>{
  const snapshot=Snapshot.parse(input),sourceHash=snapshotHash(snapshot);
  const client=await pool.connect();
  try{
    await client.query('begin');await client.query("set local timezone='UTC'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('kyb-local-import',0))");
    const previous=(await client.query('select source_hash,receipt from local_fixture.import_history')).rows;
    if(previous.length){
      const same=previous.find(r=>r.source_hash===sourceHash);
      if(!same)throw new Error('A different source has already been imported; refusing to merge or overwrite');
      await client.query('commit');return {alreadyImported:true,receipt:Receipt.parse(same.receipt)};
    }
    for(const table of DATA_TABLES.filter(t=>t!=='public.provider_licenses')){
      const count=(await client.query(`select count(*)::int as n from ${table}`)).rows[0]?.n;
      if(count!==0)throw new Error(`Target is not empty: ${table}. Refusing to overwrite.`);
    }
    await client.query('delete from public.provider_licenses');
    for(const table of DATA_TABLES){
      const [schema,name]=table.split('.');
      const metadata=await client.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position',[schema,name]);
      const columns=z.array(z.object({column_name:z.string().regex(/^[a-z_]+$/)})).parse(metadata.rows).map(r=>r.column_name);
      for(const row of snapshot.tables[table]){
        if(canonical(Object.keys(row).sort())!==canonical([...columns].sort()))throw new Error(`Column mismatch: ${table}`);
        await client.query(`insert into ${table}(${columns.map(c=>`"${c}"`).join(',')}) values(${columns.map((_,i)=>`$${i+1}`).join(',')})`,columns.map(c=>row[c]));
      }
    }
    const tables:Receipt['tables']={};
    for(const table of DATA_TABLES){
      const actual=(await client.query<{row:unknown}>(`select to_jsonb(t) as row from ${table} t`)).rows.map(r=>r.row);
      const expected=snapshot.tables[table];
      if(actual.length!==expected.length||tableHash(actual)!==tableHash(expected))throw new Error(`Post-import verification mismatch: ${table}`);
      tables[table]={count:actual.length,sha256:tableHash(actual)};
    }
    const receipt=Receipt.parse({sourceHash,tables,sessionsMigrated:false});
    await client.query('insert into local_fixture.import_history(source_hash,receipt) values($1,$2)',[sourceHash,receipt]);
    await client.query("insert into local_fixture.runtime_state(id,ready,source) values(true,true,'pglite') on conflict(id) do update set ready=true,source='pglite'");
    if(beforeCommit)await beforeCommit();
    await client.query('commit');return {alreadyImported:false,receipt};
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
