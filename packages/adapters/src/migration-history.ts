import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Client, PoolClient } from 'pg';

const historical = JSON.parse(await readFile(new URL('../../../supabase/cutover-checksums.json', import.meta.url), 'utf8')) as Record<string, string[]>;
const baseline = JSON.parse(await readFile(new URL('../../../supabase/cutover-baseline-checksums.json', import.meta.url), 'utf8')) as Record<string, string>;

/** 计算跨平台稳定的 SQL 校验值。 */
export function migrationChecksum(sql: string) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/** 校验新基线或已进行受控升级的历史迁移记录。 */
export function matchesMigration(path: string, sql: string, recorded: string, cutover: boolean) {
  const alternate = createHash('sha256').update(sql.replace(/\r?\n/g, '\r\n')).digest('hex');
  const normalized = migrationChecksum(sql);
  return recorded === normalized || recorded === alternate ||
    (cutover && normalized === baseline[path] && (historical[path]?.includes(recorded) ?? false));
}

/** 核对数据库代际和升级范围，遇到尚未升级的旧库时要求先升级。 */
export async function hasNamingCutover(client: Client | PoolClient, scope: 'fixture' | 'auth' | 'hosted') {
  const { rows: [state] } = await client.query(`select to_regclass('public.projects') as projects,
    to_regnamespace('nextsignal_private') as schema, to_regclass('nextsignal_private.naming_cutover') as cutover`);
  if (state.projects && !state.schema) throw new Error('Run the database naming cutover before starting this revision. See docs/operations/DATABASE_NAMING_CUTOVER.md.');
  if (!state.cutover) return false;
  const { rows } = await client.query('select scope from nextsignal_private.naming_cutover');
  if (rows.length !== 1 || rows[0].scope !== scope) throw new Error('The database naming cutover is recorded for a different scope.');
  return true;
}
