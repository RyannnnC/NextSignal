import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { PostgresDatabase } from './postgres.js';

import { LocalAuthConfig } from './auth-config.js';
export { readLocalAuth } from './auth-config.js';

/** 使用同一 Supabase 环境验证用户并安全分配工作区。 */
export function openAuthRuntime(config: z.infer<typeof LocalAuthConfig>) {
  const common = { host: config.host, port: config.port, database: config.database, connectionTimeoutMillis: 5000 };
  const db = new PostgresDatabase(
    new Pool({ ...common, user: 'ns_auth_backend', password: config.backendPassword }),
    new Pool({ ...common, user: 'ns_auth_queue', password: config.queuePassword }),
  );
  const auth = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sessions = {
    /** 每次从 Auth 服务器核实 JWT，再检查会话仍然存在。 */
    async resolve(token: string) {
      const { data, error } = await auth.auth.getUser(token);
      if (error || !data.user?.email_confirmed_at || !data.user.email) return null;
      let sessionId: string;
      try { sessionId = z.uuid().parse(JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()).session_id); }
      catch { return null; }
      const userId = z.uuid().parse(data.user.id);
      const active = await db.asWorker(tx => tx.query<{ active: boolean }>('select kyb_private.active_auth_session($1,$2) as active', [userId, sessionId]));
      if (!active.rows[0]?.active) return null;
      const workspaceId = await db.asUser(userId, async tx => {
        await tx.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [userId]);
        const existing = await tx.query<{ id: string }>('select id from public.workspaces where owner_id=$1', [userId]);
        if (existing.rows[0]) return existing.rows[0].id;
        const id = randomUUID();
        await tx.query('insert into public.workspaces(id,owner_id) values($1,$2)', [id, userId]);
        return id;
      });
      return { userId, workspaceId, account: data.user.email, email: data.user.email, verified: true };
    },
  };
  return { db, sessions, close: () => db.close() };
}
