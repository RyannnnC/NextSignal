import 'server-only';
import { cookies } from 'next/headers';
import { resolve } from 'node:path';
import { createServerClient } from '@supabase/ssr';
import { readLocalAuth } from '@nextsignal/adapters/auth-config';

/** 服务端维护 HttpOnly 会话 cookie，刷新只在可写路由中发生。 */
export async function supabaseServer() {
  const config = await readLocalAuth(process.env.NEXTSIGNAL_ROOT ?? resolve(process.cwd(), '../..'));
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { name: 'nextsignal-auth', httpOnly: true, sameSite: 'lax', secure: false, path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { for (const { name, value, options } of values) jar.set(name, value, options); },
    },
  });
}

/** 仅允许返回已知站内工作流，拒绝任意 URL 和编码跳转。 */
export function authReturn(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  if (['/validate', '/account', '/account/reports'].includes(value)) return value;
  if (/^\/validate\/[0-9a-f-]{36}\/(review|progress)$/.test(value) ||
      /^\/projects\/[0-9a-f-]{36}\/reports\/[0-9a-f-]{36}$/.test(value)) return value;
  return '/account';
}
