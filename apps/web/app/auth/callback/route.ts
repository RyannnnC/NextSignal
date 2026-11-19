import { cookies } from 'next/headers';
import { authReturn, supabaseServer } from '../../../lib/supabase-server';

/** 用 PKCE 验证码交换会话，失败时返回通用错误，不回显验证码。 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = 'http://127.0.0.1:3000';
  if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local' || request.headers.get('host') !== '127.0.0.1:3000') return new Response(null, { status: 404 });
  const code = url.searchParams.get('code');
  if (code && code.length < 2048) {
    const client = await supabaseServer();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const jar = await cookies();
      const next = authReturn(jar.get('nextsignal-auth-return')?.value);
      jar.set('nextsignal-auth-return', '', { path: '/auth', maxAge: 0 });
      return Response.redirect(new URL(url.searchParams.get('flow') === 'recovery' ? '/auth/reset-password' : next, origin), 303);
    }
  }
  return Response.redirect(new URL('/auth/sign-in?error=verification', origin), 303);
}
