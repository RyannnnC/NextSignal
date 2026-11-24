import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { isFixtureRoute } from '@nextsignal/contracts';
import { supabaseServer } from './supabase-server';

const Runtime = z.object({ url: z.string().refine(value => {
  if (!process.env.NEXTSIGNAL_E2E_PG_PORT) return value === 'http://127.0.0.1:4311';
  const match = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(value);
  return Boolean(match && Number(match[1]) > 0 && Number(match[1]) <= 65535);
}), key: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
/** 检查本地运行开关、来源和路由，再转发到受保护的 worker。 */
export async function bridge(request: Request, path: string): Promise<Response> {
  const realAuth = process.env.NEXTSIGNAL_AUTH_MODE === 'supabase-local';
  if ((!realAuth && process.env.NEXTSIGNAL_LOCAL_FIXTURE !== '1') || process.env.NODE_ENV === 'production') return error(503, 'local_runtime_only');
  const host = request.headers.get('host');
  const port = realAuth ? 3000 : 3001;
  if (host !== `127.0.0.1:${port}` && (realAuth || host !== `localhost:${port}`)) return error(403, 'loopback_only');
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== `http://${host}`) return error(403, 'origin_required');
  if (!isFixtureRoute(path, request.method)) return error(404, 'not_found');
  try {
    const runtime = Runtime.parse(JSON.parse(await readFile(resolve(process.env.NEXTSIGNAL_ROOT ?? resolve(process.cwd(), '../..'), '.local/runtime.json'), 'utf8')));
    const jar = await cookies();
    let token = jar.get('next_signal_session')?.value;
    if (realAuth && path !== 'health') {
      if (path === 'session' && request.method !== 'GET') return error(404, 'not_found');
      const client = await supabaseServer();
      const { data, error: authError } = await client.auth.getUser();
      if (authError || !data.user?.email_confirmed_at) return error(401, 'unauthorized');
      token = (await client.auth.getSession()).data.session?.access_token;
    }
    const headers: Record<string, string> = { 'x-local-key': runtime.key, 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    let body: string | undefined;
    if (request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return error(415, 'json_required');
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.length;
          if (size > 16384) { await reader.cancel(); return error(413, 'input_too_large'); }
          chunks.push(next.value);
        }
      }
      body = Buffer.concat(chunks).toString('utf8');
    }
    const upstream = await fetch(`${runtime.url}/${path}`, { method: request.method, headers, ...(body !== undefined ? { body } : {}), cache: 'no-store', signal: AbortSignal.timeout(5000), redirect: 'error' });
    const payload: unknown = await upstream.json();
    if (path === 'session' && request.method === 'POST' && upstream.ok) {
      const session = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), account: z.enum(['alice', 'bob']), workspaceId: z.uuid() }).strict().parse(payload);
      jar.set('next_signal_session', session.token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 3600 });
      return Response.json({ account: session.account, workspaceId: session.workspaceId }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (path === 'session' && request.method === 'DELETE') jar.delete('next_signal_session');
    return Response.json(payload, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return error(503, 'fixture_worker_unavailable'); }
}
/** 返回不可缓存且仅包含公开错误码的 API 响应。 */
function error(status: number, code: string) { return Response.json({ error: code.replaceAll('_', ' '), code }, { status, headers: { 'Cache-Control': 'no-store' } }); }
