import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';
import { localDirectory } from '@nextsignal/adapters/local-config';
import { initializeLocalPostgres, seedLocalAccounts } from '@nextsignal/adapters/local-postgres';
import { docker } from './lib/local-postgres.js';

const root = process.cwd();
const engine = await docker(['info', '--format', '{{.OSType}}'], root);
if (engine.trim() !== 'linux') throw new Error('A healthy Docker Linux engine is required for the fixture browser suite.');

const local = resolve(root, '.local');
await mkdir(local, { recursive: true, mode: 0o700 });
const runtimeRoot = await mkdtemp(resolve(local, 'e2e-'));
const project = `nextsignal-e2e-${randomBytes(8).toString('hex')}`;
const compose = ['compose', '-p', project, '-f', resolve(root, 'docker/compose.local.yml')];
const password = randomBytes(32).toString('hex');
const dockerEnv = { ...process.env, NEXTSIGNAL_LOCAL_PG_PASSWORD: password, NEXTSIGNAL_LOCAL_PG_PORT: '0' };

/** 初始化与普通 fixture 相同的数据库结构和测试账号。 */
async function prepare(port: number) {
  const config = {
    host: '127.0.0.1' as const, port, database: 'next_signal_local' as const,
    backendPassword: randomBytes(32).toString('hex'),
    queuePassword: randomBytes(32).toString('hex'),
    identityPassword: randomBytes(32).toString('hex'),
  };
  const admin = new Pool({ host: config.host, port, database: config.database, user: 'postgres', password, connectionTimeoutMillis: 5000 });
  try {
    await initializeLocalPostgres(admin, config, randomBytes(32).toString('hex'));
    const client = await admin.connect();
    try {
      await client.query('begin');
      await seedLocalAccounts(client);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  } finally { await admin.end(); }
  const directory = localDirectory(runtimeRoot);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(directory, 'runtime.json'), JSON.stringify(config), { mode: 0o600, flag: 'wx' });
}

/** 在私有测试环境中运行 Playwright 并保留测试退出状态。 */
async function runPlaywright(port: number) {
  const child = spawn(process.execPath, [resolve(root, 'node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], {
    env: { ...process.env, NEXTSIGNAL_E2E_ROOT: runtimeRoot, NEXTSIGNAL_E2E_PG_PORT: String(port) },
    stdio: 'inherit',
    windowsHide: true,
  });
  /** 将停止请求交给 Playwright 关闭浏览器及服务器。 */
  const stop = () => child.kill('SIGINT');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    return await new Promise<number>((done, reject) => {
      child.once('error', reject);
      child.once('close', code => done(code ?? 1));
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}

try {
  await docker([...compose, 'up', '-d', '--wait', '--wait-timeout', '45'], root, 180000, dockerEnv);
  const address = (await docker([...compose, 'port', 'postgres', '5432'], root, 30000, dockerEnv)).trim();
  const port = Number(/^127\.0\.0\.1:(\d+)$/.exec(address)?.[1]);
  if (!Number.isInteger(port) || port === 54328) throw new Error('Expected a disposable loopback PostgreSQL port.');
  await prepare(port);
  process.exitCode = await runPlaywright(port);
} finally {
  try {
    await docker([...compose, 'down', '--volumes'], root, 30000, dockerEnv);
  } finally {
    if (dirname(runtimeRoot) === local) await rm(runtimeRoot, { recursive: true, force: true });
  }
}
