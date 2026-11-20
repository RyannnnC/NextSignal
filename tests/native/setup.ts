import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { LOCAL_ACCOUNTS } from '@nextsignal/adapters';
import { PostgresDatabase } from '@nextsignal/adapters/postgres';

/** 创建指向一次性测试库的连接池。 */
export function pool(user: string, password: string): Pool {
  return new Pool({ host: '127.0.0.1', port: Number(process.env.NEXTSIGNAL_TEST_PG_PORT ?? 54329), user, password, database: 'nextsignal_native_test', max: 8, connectionTimeoutMillis: 5000 });
}
/** 获取一次性测试库的管理连接。 */
export const admin = () => pool('postgres', process.env.NEXTSIGNAL_TEST_PG_PASSWORD ?? '');
/** 为原生测试构造应用和队列连接。 */
export function database(): PostgresDatabase {
  const password = process.env.NEXTSIGNAL_TEST_ROLE_PASSWORD;
  if (process.env.NEXTSIGNAL_NATIVE_TEST !== '1' || !password) throw new Error('Use npm run test:postgres; no fallback is allowed.');
  return new PostgresDatabase(pool('nextsignal_test_backend', password), pool('nextsignal_test_queue', password));
}
/** 按版本顺序加载并执行基线 SQL。 */
export async function migrations(db: Pool) {
  const names = (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort();
  for (const name of names) await db.query(await readFile(`supabase/migrations/${name}`, 'utf8'));
}
/** 初始化一次性测试库、角色和两组测试身份。 */
export async function bootstrap(db: Pool) {
  if (process.env.NEXTSIGNAL_NATIVE_TEST !== '1') throw new Error('Disposable native test environment required');
  const result = await db.query('select current_database() as db');
  if (result.rows[0]?.db !== 'nextsignal_native_test') throw new Error('Refusing non-test database');
  await db.query(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await migrations(db);
  const password = process.env.NEXTSIGNAL_TEST_ROLE_PASSWORD;
  if (!password || !/^[a-f0-9]{64}$/.test(password)) throw new Error('Missing generated test role password');
  await db.query(`create role nextsignal_test_backend login password '${password}' nosuperuser nobypassrls;
    create role nextsignal_test_queue login password '${password}' nosuperuser nobypassrls;
    grant nextsignal_app to nextsignal_test_backend; grant nextsignal_worker to nextsignal_test_queue;`);
  for (const actor of Object.values(LOCAL_ACCOUNTS)) {
    await db.query('insert into auth.users(id) values($1)', [actor.userId]);
    await db.query('insert into public.workspaces(id,owner_id) values($1,$2)', [actor.workspaceId, actor.userId]);
  }
}
