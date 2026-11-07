import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

const project = `kyb-native-test-${randomBytes(6).toString('hex')}`;
const env = { ...process.env, KYB_TEST_PG_PASSWORD: randomBytes(32).toString('hex'), KYB_TEST_ROLE_PASSWORD: randomBytes(32).toString('hex') };
const compose = ['compose', '-p', project, '-f', 'docker/compose.native-test.yml'];
let composeStarted = false;
function docker(args: string[], timeout: number): Promise<string> {
  return new Promise((done, reject) => execFile('docker', args, { env, timeout, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(new Error(`Docker command failed: docker ${args.join(' ')}\n${stderr || error.message}`)); else done(stdout);
  }));
}
try {
  const engine = await docker(['info', '--format', '{{.OSType}} {{.ServerVersion}}'], 20000);
  if (!engine.startsWith('linux ')) throw new Error('A healthy Docker Linux engine is required. No fallback database will be used.');
  console.log(`Native test engine: ${engine.trim()}`);
  composeStarted = true;
  console.log(await docker([...compose, 'up', '-d', '--wait', '--wait-timeout', '45'], 180000));
  const result = await new Promise<number>((done, reject) => {
    const config=process.argv[2]==='import'?'vitest.import.config.ts':'vitest.native.config.ts';
    const child = spawn(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), 'run', '--config', config], { env: { ...env, KYB_NATIVE_TEST: '1' }, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('exit', code => done(code ?? 1));
  });
  process.exitCode = result;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Native PostgreSQL test failed');
  process.exitCode = 1;
} finally {
  // This random project owns only its disposable test container/tmpfs, never the application database.
  if (composeStarted) try { await docker([...compose, 'down', '--volumes', '--remove-orphans'], 30000); } catch { console.error('Could not clean test project; inspect Docker project:', project); }
}
