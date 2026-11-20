import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';

const run = promisify(execFile);
const engine = await run('docker', ['info', '--format', '{{.OSType}}']);
if (engine.stdout.trim() !== 'linux') throw new Error('Healthy Docker Linux engine required');
try { await run('docker', ['network', 'inspect', 'nextsignal-auth-loopback']); }
catch {
  await run('docker', ['network', 'create', '-o', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', 'nextsignal-auth-loopback']);
}
await mkdir('.local', { recursive: true, mode: 0o700 });
try {
  const result = await run(process.execPath, ['node_modules/supabase/dist/supabase.js', 'start', '--workdir', 'supabase/auth-local', '--network-id', 'nextsignal-auth-loopback'], { timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  await writeFile('.local/supabase-start.log', result.stdout + result.stderr, { mode: 0o600 });
} catch { throw new Error('Local Supabase start failed. Check Docker and the isolated project configuration.'); }
await import('./bind-auth-loopback.js');
await import('./setup-auth-local.js');
console.log('Local Supabase ready. Start the application with npm run dev.');
