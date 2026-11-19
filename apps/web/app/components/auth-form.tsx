'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestAuth } from '../../lib/client-api';
import { useLanguage } from './site-shell';

/** 通过服务端认证入口提交注册或登录，浏览器不保存访问令牌。 */
export function AuthForm({ signup = false, returnTo = '/account', verificationError = false }: { signup?: boolean; returnTo?: string; verificationError?: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(verificationError ? 'The verification link is invalid or expired. Sign in or register to try again.' : '');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSent(false);
    try {
      const ok = await requestAuth({
        action: signup ? 'sign-up' : 'sign-in', email: data.get('email'), password: data.get('password'), next: returnTo,
      });
      if (!ok) { setError('Check your details and email verification, then try again.'); return; }
      if (signup) setSent(true);
      else { router.replace(returnTo); router.refresh(); }
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="flow-layout">
    <div><h1>{t(signup ? 'Create your account' : 'Sign In')}</h1><p>{t('Use your email to access your private projects and reports.')}</p></div>
    <section className="flow-form">
      <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="email">{t('Email')}</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={320} />
        <label htmlFor="password">{t('Password')}</label><input id="password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 12 : 1} maxLength={128} required />
        {signup && <p>{t('Use at least 12 characters.')}</p>}
        <button disabled={busy}>{t(busy ? 'Please wait…' : signup ? 'Create account' : 'Sign In')}</button>
      </form>
      {busy && <p role="status">{t(signup ? 'Sending verification email…' : 'Signing in…')}</p>}
      {error && <p className="error-banner" role="alert">{t(error)}</p>}
      {sent && <div className="status-banner" role="status">
        <p>{t('Check your email for a verification link. If this address can register, a message will arrive.')}</p>
        <p>{t('Open the verification link in the same browser.')}</p>
        {returnTo === '/validate' && <p>{t('If you verify in another tab, come back here and continue in this tab to reopen your saved draft.')} <Link href={returnTo}>{t('Continue to your idea')}</Link></p>}
      </div>}
      <Link href={signup ? `/auth/sign-in?next=${encodeURIComponent(returnTo)}` : `/auth/sign-up?next=${encodeURIComponent(returnTo)}`}>{t(signup ? 'Already have an account? Sign in' : 'Create an account')}</Link>
      {!signup && <p><Link href="/auth/forgot-password">{t('Forgot password?')}</Link></p>}
    </section>
  </div>;
}
