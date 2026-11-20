import { z } from 'zod';
import { cookies } from 'next/headers';
import { supabaseServer } from '../../../lib/supabase-server';
import { authReturn } from '../../../lib/auth-return';

const Input = z.object({
  action: z.enum(['sign-in', 'sign-up', 'sign-out', 'forgot-password', 'reset-password']),
  email: z.email().max(320).optional(), password: z.string().min(1).max(128).optional(),
  next: z.string().max(200).optional(),
}).strict();
/** 受同源保护的认证入口，凭据只转交本地 Supabase Auth。 */
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local' || process.env.NODE_ENV === 'production') return Response.json({ error: 'unavailable' }, { status: 404, headers });
  if (request.headers.get('host') !== '127.0.0.1:3000' || request.headers.get('origin') !== 'http://127.0.0.1:3000') return Response.json({ error: 'origin_required' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'invalid_input' }, { status: 415, headers });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 2048) { await reader.cancel(); return Response.json({ error: 'invalid_input' }, { status: 413, headers }); }
      chunks.push(part.value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const input = Input.parse(JSON.parse(text));
    const client = await supabaseServer();
    if (input.action === 'sign-out') {
      const { error } = await client.auth.signOut();
      return Response.json({ ok: !error }, { status: error ? 503 : 200, headers });
    }
    if (input.action === 'forgot-password') {
      const email = z.email().parse(input.email);
      await client.auth.resetPasswordForEmail(email, { redirectTo: 'http://127.0.0.1:3000/auth/callback?flow=recovery' });
      return Response.json({ ok: true }, { headers });
    }
    if (input.action === 'reset-password') {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user?.email_confirmed_at) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
      const { error: updateError } = await client.auth.updateUser({ password: z.string().min(12).parse(input.password) });
      return Response.json({ ok: !updateError }, { status: updateError ? 400 : 200, headers });
    }
    const email = z.email().parse(input.email), password = z.string().min(input.action === 'sign-up' ? 12 : 1).parse(input.password);
    if (input.action === 'sign-up') {
      (await cookies()).set('nextsignal-auth-return', authReturn(input.next), { httpOnly: true, sameSite: 'lax', path: '/auth', maxAge: 900 });
      const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: 'http://127.0.0.1:3000/auth/callback' } });
      // Registration responses do not reveal whether an address already exists.
      return Response.json({ ok: !error }, { status: error ? 400 : 200, headers });
    }
    const { error } = await client.auth.signInWithPassword({ email, password });
    return Response.json({ ok: !error }, { status: error ? 400 : 200, headers });
  } catch { return Response.json({ error: 'auth_failed' }, { status: 400, headers }); }
}
