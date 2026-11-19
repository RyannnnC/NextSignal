import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { prepareLocalRuntime } from './lib/local-postgres.js';

const root = process.cwd();
if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local') await prepareLocalRuntime(root);
const env = { ...process.env, NEXTSIGNAL_LOCAL_FIXTURE: '1', NEXTSIGNAL_ROOT: root, NEXT_TELEMETRY_DISABLED: '1' };
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], { cwd: root, env, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: resolve(root, 'apps/web'), env, stdio: 'inherit', windowsHide: true })
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
