import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyHostedPersistence } from './lib/supabase-dev-verify.js';

const Environment = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().regex(/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^sb_publishable_[\w-]+$/),
  KYB_SUPABASE_DEV_PROJECT_REF: z.union([z.literal(''), z.string().regex(/^[a-z0-9]{20}$/)]).optional(),
  KYB_SUPABASE_DEV_MIGRATION_URL: z.string().optional(),
  KYB_SUPABASE_DEV_CA_FILE: z.string().optional(),
});
class PreflightError extends Error {}
const migrations = [
  'migrations/202610270001_m1.sql',
  'migrations/202610270002_lease_exhaustion.sql',
  'hosted/migrations/202611070001_dev_access_controls.sql',
  'hosted/migrations/202611100001_conversations.sql',
  'hosted/migrations/202611100002_report_exports.sql',
  'hosted/migrations/202611100003_hosted_actor.sql',
] as const;

/** 校验开发项目的配置，再按指定模式连接托管服务。 */
async function preflight() {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new PreflightError('TLS verification must be enabled for Supabase preflight.');
  const file = await readFile('.env.supabase-dev.local', 'utf8').catch(() => {
    throw new PreflightError('Create the ignored .env.supabase-dev.local using the Supabase entries in .env.example.');
  });
  let variables: ReturnType<typeof parseEnv>;
  try { variables = parseEnv(file); }
  catch { throw new PreflightError('Could not parse .env.supabase-dev.local.'); }
  if (!variables.NEXT_PUBLIC_SUPABASE_URL || !variables.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new PreflightError('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.supabase-dev.local.');
  }
  const parsed = Environment.safeParse(variables);
  if (!parsed.success) throw new PreflightError('Invalid or missing Supabase settings in .env.supabase-dev.local.');
  const env = parsed.data;
  const api = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const project = api.hostname.split('.')[0];
  const ref = env.KYB_SUPABASE_DEV_PROJECT_REF;
  if (ref && ref !== project) throw new PreflightError('The API URL and configured development project reference disagree.');

  const databaseUrl = env.KYB_SUPABASE_DEV_MIGRATION_URL;
  const caFile = env.KYB_SUPABASE_DEV_CA_FILE;
  const database = databaseUrl ? databaseConfig(databaseUrl, ref) : null;
  if (database && !caFile) throw new PreflightError('The SQL probe requires the database CA file from the Supabase dashboard.');
  const mode = process.argv[2];
  if (mode !== undefined && mode !== '--apply' && mode !== '--verify') throw new PreflightError('Expected --apply, --verify or no argument for read-only preflight.');
  if (mode && (!database || !caFile || !database.host.endsWith('.pooler.supabase.com'))) {
    throw new PreflightError('This operation requires the matching Sydney session pooler and database CA.');
  }

  const response = await fetch(new URL('/auth/v1/settings', api), {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  }).catch(() => { throw new PreflightError('The Supabase Auth endpoint could not be reached over HTTPS.'); });
  await response.body?.cancel();
  if (!response.ok) throw new PreflightError(`Supabase Auth endpoint returned HTTP ${response.status}.`);
  console.log('Supabase Auth endpoint accepted the publishable key over HTTPS.');

  if (database && caFile) await inspectDatabase(database, caFile, mode);
  else console.log('PostgreSQL probe not run. Set the development project reference, connection URL and CA file to enable it.');
  if (mode === '--verify') {
    const sdk = createClient(api.origin, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, redirect: 'error' }) },
    });
    const result = await sdk.from('projects').select('id').limit(1).abortSignal(AbortSignal.timeout(8000));
    if (result.status !== 401 && result.status !== 403 && result.status !== 404) {
      throw new PreflightError(`Anonymous project API access did not return a denial (HTTP ${result.status}).`);
    }
    console.log(`Anonymous project API request denied (HTTP ${result.status}).`);
  }
}

/** 验证数据库地址与项目匹配，拆分连接参数以独立配置 TLS。 */
function databaseConfig(input: string, ref: string | undefined) {
  const url = URL.parse(input);
  if (!url || !ref || !['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname !== '/postgres' ||
      (url.port && url.port !== '5432') || url.hash || !url.password) {
    throw new PreflightError('Expected a dashboard PostgreSQL URL for the configured development project on port 5432.');
  }
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  if (password === '[YOUR-PASSWORD]') throw new PreflightError('Replace the dashboard database password placeholder locally.');
  const direct = url.hostname === `db.${ref}.supabase.co` && user === 'postgres';
  const sydneyPooler = /^aws-\d+-ap-southeast-2\.pooler\.supabase\.com$/.test(url.hostname) && user === `postgres.${ref}`;
  if (!direct && !sydneyPooler) throw new PreflightError('The SQL target must be the matching direct endpoint or Sydney session pooler.');
  return { host: url.hostname, port: 5432, user, password, database: 'postgres' };
}

/** 通过验证证书的连接检查托管库元数据，并执行指定操作。 */
async function inspectDatabase(database: ReturnType<typeof databaseConfig>, caFile: string, mode: '--apply' | '--verify' | undefined) {
  const ca = await readFile(caFile, 'utf8').catch(() => { throw new PreflightError('Could not read the configured Supabase database CA file.'); });
  const client = new Client({ ...database, ssl: { ca, rejectUnauthorized: true }, connectionTimeoutMillis: 8000, query_timeout: 8000 });
  client.on('error', () => { /* The query or connection error is reported with credentials suppressed. */ });
  try {
    await client.connect();
    await client.query('begin read only');
    await client.query("set local statement_timeout = '5s'");
    const result = await client.query(`select current_setting('server_version_num')::integer as version,
      to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null as auth_schema,
      to_regclass('supabase_migrations.schema_migrations') is not null as migration_table,
      to_regclass('public.projects') is not null as projects,
      to_regclass('storage.buckets') is not null as storage_schema,
      (select count(*)::integer from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p','v','m','f')) as public_relations,
      (select count(*)::integer from pg_roles where rolname in ('kyb_app','kyb_worker')) as kyb_roles`);
    const metadata = z.object({ version: z.number().int(), auth_schema: z.boolean(), migration_table: z.boolean(), projects: z.boolean(), storage_schema: z.boolean(), public_relations: z.number().int(), kyb_roles: z.number().int() }).strict().parse(result.rows[0]);
    await client.query('rollback');
    console.log('PostgreSQL metadata over verified TLS:', metadata);
    if (!metadata.auth_schema || !metadata.storage_schema) throw new PreflightError('The expected Supabase Auth or Storage schema is missing.');
    if (mode === '--apply') await applyMigrations(client);
    if (mode === '--verify') await verifyHostedPersistence(client);
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    const code = z.object({ code: z.string().regex(/^[A-Z0-9_]{1,50}$/) }).safeParse(error);
    throw new PreflightError(`PostgreSQL operation failed${code.success ? ` (${code.data.code})` : ''}. Check the endpoint, credentials, CA certificate and database permissions.`);
  } finally {
    await client.end();
  }
}

/** 核对迁移历史和授权，在一个事务中应用待执行版本。 */
async function applyMigrations(client: Client) {
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('next-signal-hosted-dev', 0))");
    const state = await client.query(`select
      to_regnamespace('kyb_private') is not null as private_schema,
      to_regclass('supabase_migrations.schema_migrations') is not null as existing_ledger,
      to_regclass('kyb_private.hosted_migrations') is not null as hosted_ledger,
      exists(select from pg_roles where rolname in ('kyb_app','kyb_worker')) as existing_roles,
      exists(select from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p','v','m','f')) as existing_relations`);
    const { private_schema, existing_ledger, hosted_ledger, existing_roles, existing_relations } = z.object({ private_schema: z.boolean(), existing_ledger: z.boolean(), hosted_ledger: z.boolean(), existing_roles: z.boolean(), existing_relations: z.boolean() }).parse(state.rows[0]);
    if (existing_ledger || (!hosted_ledger && (private_schema || existing_roles || existing_relations))) throw new PreflightError('Refusing to initialize an occupied or externally migrated project. Review its migration history first.');
    const applied = hosted_ledger ? z.array(z.object({ path: z.string(), checksum: z.string() })).parse((await client.query('select path,checksum from kyb_private.hosted_migrations')).rows) : [];
    const files = await Promise.all(migrations.map(async path => {
      const sql = await readFile(new URL(`../supabase/${path}`, import.meta.url), 'utf8');
      return { path, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    }));
    const prefix = files.slice(0, applied.length);
    if (prefix.length !== applied.length || applied.some(row => !prefix.some(file => file.path === row.path && file.checksum === row.checksum))) {
      throw new PreflightError('Hosted migration ledger does not match the source files. Review its history before applying changes.');
    }
    const owner = await client.query('select rolbypassrls or rolsuper as can_claim from pg_roles where rolname = current_user');
    if (owner.rows[0]?.can_claim !== true) throw new PreflightError('The migration role cannot own the existing SECURITY DEFINER queue function with forced RLS.');
    const pending = files.slice(applied.length);
    for (const { path, sql, checksum } of pending) {
      try { await client.query(sql.replace(/^(?:begin|commit);\r?$/gim, '')); }
      catch (error) {
        const code = z.object({ code: z.string().regex(/^[A-Z0-9]{5}$/) }).safeParse(error);
        throw new PreflightError(`Migration ${path} failed${code.success ? ` (SQLSTATE ${code.data.code})` : ''}. The transaction will roll back.`);
      }
      await client.query(`create table if not exists kyb_private.hosted_migrations (
        path text primary key, checksum text not null, applied_at timestamptz not null default now())`);
      await client.query('insert into kyb_private.hosted_migrations(path,checksum) values($1,$2)', [path, checksum]);
    }
    const grants = await client.query(`select
      exists(select from pg_roles cross join pg_class
        where rolname in ('anon','authenticated','service_role') and relnamespace = 'public'::regnamespace and relkind = 'r'
        and (has_table_privilege(rolname, pg_class.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          or has_any_column_privilege(rolname, pg_class.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))) as leaked_table_grant,
      exists(select from pg_roles where rolname in ('anon','authenticated','service_role','kyb_app')
        and has_function_privilege(rolname, 'public.claim_fixture_job()', 'EXECUTE')) as leaked_queue_grant,
      has_function_privilege('kyb_worker', 'public.claim_fixture_job()', 'EXECUTE') as worker_grant,
      exists(select from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname <> 'provider_licenses'
        and not (relrowsecurity and relforcerowsecurity)) as missing_rls`);
    const checks = z.object({ leaked_table_grant: z.literal(false), leaked_queue_grant: z.literal(false), worker_grant: z.literal(true), missing_rls: z.literal(false) });
    if (!checks.safeParse(grants.rows[0]).success) throw new PreflightError('Hosted privilege checks failed. The migration transaction will roll back.');
    await client.query('commit');
    console.log(`Committed ${pending.length} pending hosted development migrations.`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

preflight().catch((error: unknown) => {
  // Only explicitly redacted errors should reach the terminal.
  if (error instanceof URIError) console.error('Invalid percent-encoding in the PostgreSQL URL.');
  else if (error instanceof PreflightError) console.error(error.message);
  else console.error('Unexpected preflight error. Diagnostic details suppressed.');
  process.exitCode = 1;
});
