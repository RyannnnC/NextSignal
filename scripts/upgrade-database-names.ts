import { Client } from 'pg';
import { createConnection } from 'node:net';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [scope, operation] = process.argv.slice(2);
if (scope !== 'fixture' && scope !== 'auth' && scope !== 'hosted') throw new Error('Select fixture, auth or hosted.');
if (operation !== '--apply') throw new Error('Use --apply only after restoring and checking a private backup.');

const connection = URL.parse(process.env.NEXTSIGNAL_CUTOVER_DATABASE_URL ?? '');
if (!connection || !['postgres:', 'postgresql:'].includes(connection.protocol) || connection.hostname !== '127.0.0.1' ||
    connection.username !== 'postgres' || !connection.port || connection.search || connection.hash) {
  throw new Error('Supply NEXTSIGNAL_CUTOVER_DATABASE_URL for a local administrator connection.');
}
if (scope === 'hosted' && ['54328', '55422'].includes(connection.port)) throw new Error('Hosted rehearsal requires a separate disposable instance.');
if ((connection.port === '54328' && scope !== 'fixture') || (connection.port === '55422' && scope !== 'auth')) {
  throw new Error('The selected scope does not match the local database port.');
}

/** 检查应用端口，避免在服务仍运行时修改角色。 */
function listening(port: number) {
  return new Promise<boolean>(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => { socket.destroy(); resolve(true); });
  });
}

const known = JSON.parse(await readFile(new URL('../supabase/cutover-checksums.json', import.meta.url), 'utf8')) as Record<string, string[]>;
for (const [path, hashes] of Object.entries(known)) {
  const sql = await readFile(new URL(`../supabase/${path}`, import.meta.url));
  if (!hashes.includes(createHash('sha256').update(sql).digest('hex'))) throw new Error(`Historical migration file changed: ${path}`);
}

const fixture = scope === 'fixture';
const auth = scope === 'auth';
const ledger = fixture ? 'local_fixture.schema_migrations' : auth ? 'kyb_private.auth_local_migrations' : 'kyb_private.hosted_migrations';
const renamedLedger = ledger.replace('kyb_private', 'nextsignal_private');
const roles = [
  ['kyb_app', 'nextsignal_app'], ['kyb_worker', 'nextsignal_worker'],
  ...(fixture ? [['kyb_local_backend', 'nextsignal_local_backend'], ['kyb_local_queue', 'nextsignal_local_queue'],
    ['kyb_local_identity', 'nextsignal_local_identity'], ['kyb_local_inspector', 'nextsignal_local_inspector']] : []),
  ...(auth ? [['ns_auth_backend', 'nextsignal_auth_backend'], ['ns_auth_queue', 'nextsignal_auth_queue']] : []),
] as const;
const locks = fixture ? ['kyb-local-bootstrap', 'kyb-local-import', 'nextsignal-local-bootstrap', 'nextsignal-local-import'] :
  auth ? ['nextsignal-auth-local'] : ['next-signal-hosted-dev'];

/** 在单一事务中核验账本并保留数据库对象的标识和授权。 */
async function upgrade() {
  const client = new Client({ connectionString: connection!.href, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    for (const lock of locks) await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [lock]);
    const { rows: [state] } = await client.query(`select to_regclass($1) as ledger,
      to_regclass('nextsignal_private.naming_cutover') as cutover,
      exists(select from pg_stat_activity where datname=current_database() and usename=any($2)) as writer`,
    [ledger, roles.flat()]);
    if (state.writer) throw new Error('Stop all scoped database clients before upgrading.');
    const upgraded = Boolean(state.cutover);
    if (upgraded) {
      const marker = (await client.query('select scope from nextsignal_private.naming_cutover')).rows;
      if (marker.length !== 1 || marker[0].scope !== scope) throw new Error('The cutover marker belongs to another scope.');
    } else if (!state.ledger) throw new Error('The historical ledger for the requested scope is missing.');

    const shared = Object.keys(known).filter(path => path.startsWith('migrations/'));
    const hosted = Object.keys(known).filter(path => path.startsWith('hosted/'));
    const authOnly = Object.keys(known).filter(path => path.startsWith('auth-local/'));
    const expected = fixture ? shared : [...shared.slice(0, 2), ...hosted, ...shared.slice(2), ...(auth ? authOnly : [])];
    const history = (await client.query(fixture ? `select version as key,checksum from ${ledger}` :
      `select path as key,checksum from ${upgraded ? renamedLedger : ledger}`)).rows;
    const prefix = expected.slice(0, history.length);
    if (history.length < 2 || history.length > expected.length || history.some(({ key, checksum }) =>
      !prefix.some(path => (fixture ? /^migrations\/(\d+)/.exec(path)?.[1] : path) === key && known[path]!.includes(checksum)))) {
      throw new Error('Historical migration ledger checksum or sequence differs.');
    }
    if (fixture) {
      const runtime = (await client.query('select version,checksum from local_fixture.runtime_migrations')).rows;
      if (runtime.length !== 1 || runtime[0].version !== '0001' || !known['local/0001_runtime.sql']!.includes(runtime[0].checksum)) {
        throw new Error('Historical fixture runtime checksum differs.');
      }
    }
    if (!upgraded) {
      const sourceReferences = (await client.query(`select count(*)::int as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('public','kyb_private','local_fixture')
          and concat_ws(' ',p.prosrc,array_to_string(p.proconfig,' ')) ~* 'kyb[_-]'`)).rows[0]?.count;
      if (sourceReferences !== 0) throw new Error('Procedure text references the original names. Review before upgrading.');
      await client.query('alter schema kyb_private rename to nextsignal_private');
      for (const [from, to] of roles) await client.query(`alter role ${from} rename to ${to}`);
      await client.query('create table nextsignal_private.naming_cutover(scope text primary key)');
      await client.query('revoke all on nextsignal_private.naming_cutover from public');
      await client.query('insert into nextsignal_private.naming_cutover values ($1)', [scope]);
    }
    await client.query('commit');
    console.log(`Verified ${history.length} historical migration checksums. ${scope} cutover ${upgraded ? 'already recorded' : 'committed'}.`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { await client.end(); }
}

await mkdir('.local', { recursive: true, mode: 0o700 });
const localLock = await open('.local/migration.lock', 'wx', 0o600);
try {
  await localLock.writeFile(String(process.pid));
  if ((await Promise.all([3000, 3001, 4311].map(listening))).some(Boolean)) throw new Error('Stop the local web and worker processes before upgrading.');
  await upgrade();
} finally {
  await localLock.close();
  await unlink('.local/migration.lock');
}
