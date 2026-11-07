import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { LOCAL_ACCOUNTS } from '@kyb/adapters';
import { PostgresDatabase } from '@kyb/adapters/postgres';

export function pool(user: string, password: string): Pool {
  return new Pool({ host: '127.0.0.1', port: Number(process.env.KYB_TEST_PG_PORT ?? 54329), user, password, database: 'kyb_native_test', max: 8, connectionTimeoutMillis: 5000 });
}
export const admin = () => pool('postgres', process.env.KYB_TEST_PG_PASSWORD ?? '');
export function database(): PostgresDatabase {
  const password = process.env.KYB_TEST_ROLE_PASSWORD;
  if (process.env.KYB_NATIVE_TEST !== '1' || !password) throw new Error('Use npm run test:postgres; no fallback is allowed.');
  return new PostgresDatabase(pool('kyb_test_backend', password), pool('kyb_test_queue', password));
}
export async function migrations(db: Pool) {
  const names = (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort();
  for (const name of names) await db.query(await readFile(`supabase/migrations/${name}`, 'utf8'));
}
export async function bootstrap(db: Pool) {
  if (process.env.KYB_NATIVE_TEST !== '1') throw new Error('Disposable native test environment required');
  const result = await db.query('select current_database() as db');
  if (result.rows[0]?.db !== 'kyb_native_test') throw new Error('Refusing non-test database');
  await db.query(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await migrations(db);
  const password = process.env.KYB_TEST_ROLE_PASSWORD;
  if (!password || !/^[a-f0-9]{64}$/.test(password)) throw new Error('Missing generated test role password');
  await db.query(`create role kyb_test_backend login password '${password}' nosuperuser nobypassrls;
    create role kyb_test_queue login password '${password}' nosuperuser nobypassrls;
    grant kyb_app to kyb_test_backend; grant kyb_worker to kyb_test_queue;`);
  for (const actor of Object.values(LOCAL_ACCOUNTS)) {
    await db.query('insert into auth.users(id) values($1)', [actor.userId]);
    await db.query('insert into public.workspaces(id,owner_id) values($1,$2)', [actor.workspaceId, actor.userId]);
  }
}
