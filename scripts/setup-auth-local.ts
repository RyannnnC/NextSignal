import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';

const raw = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--workdir', 'supabase/auth-local', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const status = JSON.parse(raw) as Record<string, string>;
if (status.API_URL !== 'http://127.0.0.1:55421') throw new Error('Unexpected local Auth URL');
const url = new URL(status.DB_URL!);
if (url.hostname !== '127.0.0.1' || url.port !== '55422' || url.pathname !== '/postgres') throw new Error('Unexpected local database');
const files = [
  'migrations/202610270001_m1.sql', 'migrations/202610270002_lease_exhaustion.sql',
  'hosted/migrations/202611070001_dev_access_controls.sql',
  'hosted/migrations/202611100001_conversations.sql', 'hosted/migrations/202611100002_report_exports.sql',
  'hosted/migrations/202611100003_hosted_actor.sql',
  'migrations/202611120001_abs_cache.sql', 'migrations/202611140001_abs_regional_indicators.sql',
  'auth-local/202611190001_runtime.sql',
  'auth-local/202611190002_workspace.sql',
];
const client = new Client({ connectionString: status.DB_URL });
await client.connect();
try {
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtextextended('nextsignal-auth-local',0))");
  const existing = (await client.query("select to_regclass('kyb_private.auth_local_migrations') as name")).rows[0]?.name;
  if (!existing && (await client.query("select to_regclass('public.projects') as name")).rows[0]?.name) throw new Error('Occupied untracked local database');
  await client.query('create schema if not exists kyb_private; revoke all on schema kyb_private from public');
  await client.query('create table if not exists kyb_private.auth_local_migrations(path text primary key, checksum text not null)');
  for (const file of files) {
    const sql = await readFile(`supabase/${file}`, 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const prior = (await client.query('select checksum from kyb_private.auth_local_migrations where path=$1', [file])).rows[0];
    if (prior) { if (prior.checksum !== hash) throw new Error('Local Auth migration checksum mismatch'); continue; }
    await client.query(sql.replace(/^(?:begin|commit);\r?$/gim, ''));
    await client.query('insert into kyb_private.auth_local_migrations values($1,$2)', [file, hash]);
  }
  let runtime: { backendPassword: string; queuePassword: string };
  try { runtime = JSON.parse(await readFile('.local/auth-local.json', 'utf8')); }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
    runtime = { backendPassword: randomBytes(32).toString('hex'), queuePassword: randomBytes(32).toString('hex') };
  }
  for (const [role, password, parent] of [['ns_auth_backend', runtime.backendPassword, 'kyb_app'], ['ns_auth_queue', runtime.queuePassword, 'kyb_worker']]) {
    if (!/^[a-f0-9]{64}$/.test(password!)) throw new Error('Invalid local credential');
    if (!(await client.query('select from pg_roles where rolname=$1', [role])).rows.length) await client.query(`create role ${role} login noinherit nosuperuser nobypassrls`);
    await client.query(`alter role ${role} password '${password}'`);
    await client.query(`grant ${parent} to ${role}`);
  }
  await client.query('commit');
  await mkdir('.local', { recursive: true, mode: 0o700 });
  await writeFile('.local/auth-local.json', JSON.stringify({ ...runtime, url: status.API_URL, key: status.PUBLISHABLE_KEY ?? status.ANON_KEY, host: '127.0.0.1', port: 55422, database: 'postgres' }), { mode: 0o600 });
  console.log('Isolated local Auth schema and restricted runtime roles ready. Credentials saved privately.');
} catch (error) { await client.query('rollback'); throw error; }
finally { await client.end(); }
