import { spawn } from 'node:child_process';
import { readLocalAuth } from '@nextsignal/adapters/auth-local';

await readLocalAuth(process.cwd());
const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/dev.ts'], {
  env: { ...process.env, NEXTSIGNAL_AUTH_MODE: 'supabase-local' }, stdio: 'inherit', windowsHide: true,
});
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => { child.kill(); });
process.on('SIGTERM', () => { child.kill(); });
