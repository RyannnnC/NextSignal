'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { requestAuth } from '../../lib/client-api';
import { useLanguage } from './site-shell';

/** 通过同源服务端入口请求恢复邮件或更新已验证账号的密码。 */
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const ok = await requestAuth(reset
        ? { action: 'reset-password', password: data.get('password') } : { action: 'forgot-password', email: data.get('email') });
      setMessage(ok ? reset ? 'Password updated. You can sign in with your new password.' : 'If this address can receive a reset link, check your email.' : 'Check your details and email verification, then try again.');
    } catch { setMessage('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="flow-layout"><h1>{t(reset ? 'Set a new password' : 'Reset password')}</h1>
    <section className="flow-form"><form onSubmit={submit}>
      <label htmlFor={reset ? 'password' : 'email'}>{t(reset ? 'Password' : 'Email')}</label>
      {reset ? <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
        : <input id="email" name="email" type="email" autoComplete="email" maxLength={320} required />}
      <button disabled={busy}>{t(reset ? 'Update password' : 'Send reset link')}</button>
    </form>{message && <p role="status">{t(message)}</p>}<Link href="/auth/sign-in">{t('Sign In')}</Link></section>
  </div>;
}
