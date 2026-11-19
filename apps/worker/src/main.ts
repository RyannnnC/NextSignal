import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readRuntimeConfig } from '@nextsignal/adapters/local-config';
import { openLocalRuntime } from '@nextsignal/adapters/local-postgres';
import { AbsProvider, PostgresAbsCache } from '@nextsignal/adapters/abs-provider';
import { access } from 'node:fs/promises';
import { createFixtureServer } from './server.js';
import { openAuthRuntime, readLocalAuth } from '@nextsignal/adapters/auth-local';

if ((process.env.NEXTSIGNAL_LOCAL_FIXTURE !== '1' && process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local') || process.env.NODE_ENV === 'production') throw new Error('Explicit local development runtime required.');
const root = resolve(process.env.NEXTSIGNAL_ROOT ?? process.cwd());
await mkdir(resolve(root, '.local'), { recursive: true });
try { await access(resolve(root,'.local/migration.lock')); throw new Error('Data migration is running; worker must remain stopped.'); }
catch(error) { if(!(typeof error==='object'&&error&&'code' in error&&error.code==='ENOENT'))throw error; }
const realAuth = process.env.NEXTSIGNAL_AUTH_MODE === 'supabase-local';
const local = realAuth ? openAuthRuntime(await readLocalAuth(root)) : openLocalRuntime(await readRuntimeConfig(root));
const ready=await local.db.asUser('00000000-0000-4000-8000-000000000001',tx=>tx.query('select id from public.workspaces limit 1'));
if(!ready.rows.length && !realAuth){await local.close();throw new Error('Native local database is not initialized/migrated. Run db:migrate or npm run dev first.');}
const key = randomBytes(32).toString('hex');
const abs = process.env.NEXTSIGNAL_ABS_ENABLED === '1'
  ? new AbsProvider(new PostgresAbsCache(work => local.db.asWorker(work))) : undefined;
const { server, runner } = createFixtureServer(local.db, local.sessions, key, abs);
server.listen(4311, '127.0.0.1', async () => {
  await writeFile(resolve(root, '.local/runtime.json'), JSON.stringify({ url: 'http://127.0.0.1:4311', key }), { mode: 0o600 });
  console.log(`Worker ready at 127.0.0.1:4311 using Docker PostgreSQL. ABS ${abs ? 'enabled' : 'disabled'}.`);
});
let active = false;
const timer = setInterval(() => {
  if (active) return;
  active = true;
  void runner.processOne().catch(() => console.error('Fixture worker iteration failed; inspect database run status.')).finally(() => { active = false; });
}, 250);
/** 停止领取新任务，等待当前任务结束后关闭数据库连接。 */
async function shutdown() { clearInterval(timer); server.close(); while (active) await new Promise(r => setTimeout(r, 25)); await local.close(); process.exit(0); }
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
