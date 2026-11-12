import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { Database, Transaction } from '@nextsignal/application';

/** Native PostgreSQL port. Identity must come from trusted server authentication. */
export class PostgresDatabase implements Database {
  /** 分别接收应用查询和 worker 领任务所用的连接池。 */
  constructor(private readonly applicationPool: Pool, private readonly queuePool: Pool) {}
  /** 在事务内设置受限角色与超时，失败时回滚。 */
  private async transaction<T>(pool: Pool, role: 'kyb_app' | 'kyb_worker', work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`set local role ${role}`);
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '10s'");
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
  /** 将可信服务端身份绑定到单个事务，供 RLS 使用。 */
  async asUser<T>(userId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
    z.uuid().parse(userId);
    return this.transaction(this.applicationPool, 'kyb_app', async client => {
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
      return work({ query: async <R>(sql: string, parameters?: unknown[]) => {
        const result = await client.query<Record<string, unknown>>(sql, parameters);
        return { rows: result.rows as R[] };
      } });
    });
  }
  /** 公共统计缓存使用受限 worker 角色及相同的事务时限。 */
  async asWorker<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.transaction(this.queuePool, 'kyb_worker', async client => work({ query: async <R>(sql: string, parameters?: unknown[]) => {
      const result = await client.query<Record<string, unknown>>(sql, parameters);
      return { rows: result.rows as R[] };
    } }));
  }
  /** 使用受限 worker 角色调用领任务函数并校验返回值。 */
  async claimJob() {
    return this.transaction(this.queuePool, 'kyb_worker', async client => {
      const result = await client.query('select * from public.claim_fixture_job()');
      if (result.rows.length === 0) return null;
      const row = z.object({ id: z.uuid(), workspace_id: z.uuid(), user_id: z.uuid(), run_id: z.uuid(), lease_token: z.uuid(), attempts: z.number().int() }).parse(result.rows[0]);
      return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, runId: row.run_id, leaseToken: row.lease_token, attempts: row.attempts };
    });
  }
  /** 关闭应用与队列的连接池。 */
  async close() { await Promise.all([this.applicationPool.end(), this.queuePool.end()]); }
}
