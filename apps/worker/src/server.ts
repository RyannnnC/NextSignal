import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { isFixtureRoute, Login, SessionView } from '@nextsignal/contracts';
import { DomainError } from '@nextsignal/domain';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { FixtureProvider } from '@nextsignal/adapters';
import type { FixtureSessions } from '@nextsignal/adapters/local-sessions';
import type { Actor, Database } from '@nextsignal/application';

/** 创建本地 HTTP 服务及复用同一数据库的 fixture 执行器。 */
export function createFixtureServer(db: Database, sessions: FixtureSessions, key: string) {
  const projects = new Projects(db);
  const runner = new ResearchRunner(db, new FixtureProvider());
  const server = createServer((req, res) => { void handle(req, res).catch(() => send(res, 500, { error: 'Local request failed', code: 'internal_error' })); });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  /** 验证内部密钥与会话，再分派白名单内的项目请求。 */
  async function handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const supplied = req.headers['x-local-key'];
      if (typeof supplied !== 'string' || supplied.length !== key.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(key))) throw new DomainError('unauthorized', 401);
      const path = req.url ?? '/';
      if (!path.startsWith('/') || !isFixtureRoute(path.slice(1), req.method ?? '')) throw new DomainError('not_found', 404);
      if (path === '/health' && req.method === 'GET') return send(res, 200, { mode: 'local-fixture', database: 'postgresql' });
      if (path === '/session' && req.method === 'POST') {
        const { account } = Login.parse(await body(req));
        return send(res, 200, await sessions.create(account));
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new DomainError('unauthorized', 401);
      const session = await sessions.resolve(token);
      if (!session) throw new DomainError('unauthorized', 401);
      const actor: Actor = { userId: session.userId, workspaceId: session.workspaceId };
      if (path === '/session' && req.method === 'GET') return send(res, 200, SessionView.parse({ account: session.account, workspaceId: actor.workspaceId }));
      if (path === '/session' && req.method === 'DELETE') {
        await sessions.revoke(token);
        return send(res, 200, { ok: true });
      }
      if (path === '/projects' && req.method === 'GET') return send(res, 200, { ids: await projects.list(actor) });
      if (path === '/projects' && req.method === 'POST') return send(res, 201, { id: await projects.create(actor, await body(req)) });
      const match = /^\/projects\/([a-f0-9-]{36})(?:\/(confirm|runs|cancel))?$/.exec(path);
      if (!match?.[1]) throw new DomainError('not_found', 404);
      const id = z.uuid().parse(match[1]);
      const action = match[2];
      if (!action && req.method === 'GET') return send(res, 200, await projects.get(actor, id));
      if (!action && req.method === 'DELETE') { await projects.delete(actor, id); return send(res, 200, { ok: true }); }
      if (action === 'confirm' && req.method === 'POST') return send(res, 200, { id: await projects.confirm(actor, id, await body(req)) });
      if (action === 'runs' && req.method === 'POST') return send(res, 202, { id: await projects.start(actor, id, await body(req)) });
      if (action === 'cancel' && req.method === 'POST') {
        const { runId } = z.object({ runId: z.uuid() }).strict().parse(await body(req));
        await projects.cancel(actor, id, runId); return send(res, 200, { ok: true });
      }
      throw new DomainError('not_found', 404);
    } catch (error) {
      const code = error instanceof DomainError ? error.code : error instanceof z.ZodError || error instanceof SyntaxError ? 'invalid_input' : 'internal_error';
      send(res, error instanceof DomainError ? error.status : code === 'invalid_input' ? 400 : 500, { error: code.replaceAll('_', ' '), code });
    }
  }
  return { server, runner };
}
/** 输出不可缓存的 JSON，并避免重复发送响应。 */
function send(res: ServerResponse, status: number, value: unknown) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
/** 限制请求体大小并解析 JSON 数据。 */
async function body(req: IncomingMessage): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new DomainError('json_required', 415);
  const chunks: Buffer[] = []; let size = 0;
  for await (const part of req) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(String(part));
    size += chunk.length;
    if (size > 16384) throw new DomainError('input_too_large', 413);
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
