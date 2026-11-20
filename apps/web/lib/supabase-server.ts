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
