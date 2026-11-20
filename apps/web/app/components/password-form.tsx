'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { requestAuth } from '../../lib/client-api';
import { useLanguage } from './site-shell';

/** 通过同源服务端入口请求恢复邮件或更新已验证账号的密码。 */
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess(false);
    try {
      const ok = await requestAuth(reset
        ? { action: 'reset-password', password: data.get('password') } : { action: 'forgot-password', email: data.get('email') });
      if (ok) setSuccess(true);
      else setError('Check your details and email verification, then try again.');
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="flow-layout"><h1>{t(reset ? 'Set a new password' : 'Reset password')}</h1>
    <section className="flow-form"><form onSubmit={submit} aria-busy={busy}>
      <label htmlFor={reset ? 'password' : 'email'}>{t(reset ? 'Password' : 'Email')}</label>
      {reset ? <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
        : <input id="email" name="email" type="email" autoComplete="email" maxLength={320} required />}
      <button disabled={busy}>{t(busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link')}</button>
    </form>
    {busy && <p role="status">{t(reset ? 'Updating password…' : 'Requesting reset email…')}</p>}
    {error && <p className="error-banner" role="alert">{t(error)}</p>}
    {success && <p className="status-banner" role="status">{t(reset ? 'Password updated. You can sign in with your new password.' : 'If this address can receive a reset link, check your email.')}</p>}
    <Link href={reset && success ? '/account' : '/auth/sign-in'}>{t(reset && success ? 'Account overview' : 'Sign In')}</Link></section>
  </div>;
}
