import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { docker } from './lib/local-postgres.js';
import { readAdminConfig } from '@nextsignal/adapters/local-config';

const root = process.cwd();
const source = 'next-signal-local-postgres-1';
const restore = `nextsignal-restore-${randomBytes(5).toString('hex')}`;
const directory = resolve(root, '.local/backups', restore);
await mkdir(directory, { recursive: true, mode: 0o700 });
const admin = new Client({ ...await readAdminConfig(root), user: 'postgres' });
await admin.connect();
try {
  const activity = await admin.query("select count(*)::int as active from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and backend_type='client backend'");
  if (activity.rows[0]?.active !== 0) throw new Error('Stop application connections before backup.');
  await admin.query('begin isolation level repeatable read read only');
  await admin.query("set local timezone = 'UTC'");
  const snapshot = (await admin.query('select pg_export_snapshot() as id')).rows[0]?.id;
  if (typeof snapshot !== 'string') throw new Error('Could not export a consistent backup snapshot');
  await docker(['exec', source, 'pg_dump', '-U', 'postgres', '-d', 'next_signal_local', '--snapshot', snapshot, '-Fc', '-f', '/tmp/nextsignal-backup.dump'], root);
  await docker(['exec', source, 'sh', '-c', 'pg_dumpall -U postgres --roles-only > /tmp/nextsignal-roles.sql'], root);
  await docker(['cp', `${source}:/tmp/nextsignal-backup.dump`, resolve(directory, 'database.dump')], root);
  await docker(['cp', `${source}:/tmp/nextsignal-roles.sql`, resolve(directory, 'roles.sql')], root);
  const image = (await docker(['inspect', source, '--format', '{{.Config.Image}}'], root)).trim();
  await docker(['run', '-d', '--name', restore, '--network', 'none', '-e', `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`, image], root);
  try {
    for (let attempt = 0; ; attempt++) {
      try { await docker(['exec', restore, 'pg_isready', '-U', 'postgres'], root); break; }
      catch { if (attempt === 30) throw new Error('Restore database unavailable'); await new Promise(done => setTimeout(done, 1000)); }
    }
    await docker(['cp', resolve(directory, 'roles.sql'), `${restore}:/tmp/roles.sql`], root);
    // postgres already exists in the fresh image; validate and omit only its CREATE ROLE line.
    const roles = await readFile(resolve(directory, 'roles.sql'), 'utf8');
    await writeFile(resolve(directory, 'restore-roles.sql'), roles.replace(/^CREATE ROLE postgres;\r?\n/m, ''), { mode: 0o600 });
    await docker(['cp', resolve(directory, 'restore-roles.sql'), `${restore}:/tmp/restore-roles.sql`], root);
    await docker(['exec', restore, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/restore-roles.sql'], root);
    await docker(['exec', restore, 'createdb', '-U', 'postgres', 'next_signal_restore'], root);
    await docker(['cp', resolve(directory, 'database.dump'), `${restore}:/tmp/database.dump`], root);
    await docker(['exec', restore, 'pg_restore', '-U', 'postgres', '-d', 'next_signal_restore', '--exit-on-error', '/tmp/database.dump'], root, 120000);
    const tables = await admin.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','local_fixture','nextsignal_private') order by 1,2");
    const verified = [];
    for (const row of tables.rows as { schemaname: string; tablename: string }[]) {
      if (!/^[a-z_]+$/.test(row.schemaname + row.tablename)) throw new Error('Unexpected table name');
      const sql = `select count(*)::text as count,md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' order by row_to_json(t)::text),'')) as hash from "${row.schemaname}"."${row.tablename}" t`;
      const expected = (await admin.query(sql)).rows[0];
      const restored = (await docker(['exec', '-e', 'PGTZ=UTC', restore, 'psql', '-U', 'postgres', '-d', 'next_signal_restore', '-At', '-c', sql], root)).trim();
      if (restored !== `${expected.count}|${expected.hash}`) throw new Error(`Restore content mismatch for ${row.schemaname}.${row.tablename}`);
      verified.push({ table: `${row.schemaname}.${row.tablename}`, ...expected });
    }
    await writeFile(resolve(directory, 'receipt.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), source, databaseSha256: createHash('sha256').update(await readFile(resolve(directory, 'database.dump'))).digest('hex'), verified }, null, 2), { mode: 0o600 });
    console.log(`Backup and isolated restore verified for ${verified.length} tables. Private files under .local/backups/${restore}/`);
  } finally { await docker(['rm', '-f', '-v', restore], root); }
} finally { await admin.query('rollback'); await admin.end(); }
