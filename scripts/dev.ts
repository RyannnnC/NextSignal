import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { readLocalAuth } from '@nextsignal/adapters/auth-config';
import { docker, prepareLocalRuntime } from './lib/local-postgres.js';

const root = process.cwd();
const e2e = process.argv.includes('--fixture-e2e');
const fixture = e2e || process.argv.includes('--fixture');
const runtimeRoot = e2e ? process.env.NEXTSIGNAL_E2E_ROOT : root;
if (!runtimeRoot || (e2e && !process.env.NEXTSIGNAL_E2E_PG_PORT)) throw new Error('Run npm run test:e2e to provision the isolated fixture database.');
const port = fixture ? 3001 : 3000;
for (const localPort of [port, 4311]) {
  await new Promise<void>((done, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Cannot bind 127.0.0.1:${localPort}. Stop the existing NextSignal application before starting this mode.`)));
    probe.listen(localPort, '127.0.0.1', () => probe.close(error => error ? reject(error) : done()));
  });
}

const os = await docker(['info', '--format', '{{.OSType}}'], root).catch(() => '');
if (os.trim() !== 'linux') throw new Error('Start Docker Desktop with its Linux engine and confirm docker info succeeds.');
if (fixture && !e2e) {
  await prepareLocalRuntime(root);
} else if (!fixture) {
  try {
    const auth = await readLocalAuth(root);
    const health = await fetch(`${auth.url}/auth/v1/health`, { headers: { apikey: auth.key }, signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error('Local Auth unavailable');
  } catch {
    throw new Error('Local Supabase Auth is unavailable or not configured. Run npm run auth:up, then npm run dev.');
  }
}

const env = {
  ...process.env,
  NEXTSIGNAL_AUTH_MODE: fixture ? '' : 'supabase-local',
  NEXTSIGNAL_LOCAL_FIXTURE: fixture ? '1' : '',
  NEXTSIGNAL_E2E_PG_PORT: e2e ? process.env.NEXTSIGNAL_E2E_PG_PORT : '',
  NEXTSIGNAL_ROOT: runtimeRoot,
  NEXT_TELEMETRY_DISABLED: '1',
};
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], { cwd: root, env, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: resolve(root, 'apps/web'), env, stdio: 'inherit', windowsHide: true })
];
let stopping = false;
/** 仅执行一次关闭操作，终止本次启动的子进程。 */
function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill(); }
for (const child of children) {
  child.on('error', () => { stop(); process.exitCode = 1; });
  child.on('exit', code => { if (!stopping) { process.exitCode = code ?? 1; stop(); } });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
