'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuOutlined } from '@ant-design/icons';
import { SessionView } from '@nextsignal/contracts';
import { api } from '../../lib/client-api';
import { Locale, translate } from '../../lib/i18n';
import { LanguageSwitch } from '../language-switch';
import styles from './site-shell.module.css';

const Language = createContext<{locale: Locale; t: (text: string) => string; realAuth: boolean} | null>(null);
const authTitles: Record<string, string> = {
  '/auth/sign-in': 'Sign In', '/auth/sign-up': 'Create your account',
  '/auth/forgot-password': 'Reset password', '/auth/reset-password': 'Set a new password',
};
/** 从站点上下文获取当前语言和翻译函数。 */
export function useLanguage() {
  const value = useContext(Language);
  if (!value) throw new Error('SiteShell is required');
  return value;
}
/** 提供全站布局及语言偏好。 */
export function SiteShell({children, realAuth = false}: {children: ReactNode; realAuth?: boolean}) {
  const [locale, setLocale] = useState<Locale>('en');
  const pathname = usePathname();
  const [session, setSession] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => void api('session').then(value => {
      if (active) setSession(SessionView.safeParse(value).success);
    }).catch(() => { if (active) setSession(false); });
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [pathname]);
  /** 按当前语言翻译界面文案。 */
  const t = (text: string) => translate(locale, text);
  useEffect(() => {
    try { const saved = Locale.safeParse(localStorage.getItem('next-signal-language')); if (saved.success) setLocale(saved.data); } catch { /* Preference storage is optional. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    if (pathname === '/') {
      document.title = `${translate(locale, 'Find your next business opportunity.')} | NextSignal`;
    } else {
      const title = pathname.startsWith('/projects/') ? 'Private fixture report'
        : pathname.endsWith('/review') ? 'Review business profile' : pathname.endsWith('/progress') ? 'Research runs'
        : pathname === '/validate' ? 'Validate My Idea' : authTitles[pathname] ? realAuth ? authTitles[pathname] : 'Local fixture sign in'
        : pathname === '/example-report' ? 'Example report'
        : pathname === '/account/reports' ? 'My reports' : pathname === '/account' ? 'Account' : 'Grow My Business';
      document.title = `NextSignal — ${translate(locale, title)}`;
    }
  }, [locale, pathname, realAuth]);
  /** 更新语言状态，并尽可能保存到本地。 */
  function changeLocale(value: Locale) {
    setLocale(value);
    try { localStorage.setItem('next-signal-language', value); } catch { /* In-memory switching remains available. */ }
  }
  return <Language.Provider value={{locale,t,realAuth}}>
    <a className="skip" href="#main">{t('Skip to content')}</a>
    <header className={styles.header}>
      <div className={`site-header ${styles.headerInner}`}>
      <Link className="wordmark" href="/" aria-label="NextSignal">Next<span>Signal</span><span className="brand-dot" aria-hidden="true"/></Link>
      <button type="button" className={`secondary ${styles.menuToggle}`} aria-controls="site-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>
        <MenuOutlined aria-hidden="true" />{t('Menu')}
      </button>
      <nav id="site-navigation" aria-label={t('Main navigation')} className={`${styles.nav} ${menu ? styles.open : ''}`} onKeyDown={event => {
        if (event.key === 'Escape') {
          setMenu(false);
          document.querySelector<HTMLButtonElement>('[aria-controls="site-navigation"]')?.focus();
        }
      }}>
        <Link onClick={() => setMenu(false)} href="/validate" aria-current={pathname.startsWith('/validate') ? 'page' : undefined}>{t('Validate My Idea')}</Link>
        <Link onClick={() => setMenu(false)} href="/grow" aria-current={pathname === '/grow' ? 'page' : undefined}>{t('Grow My Business')}</Link>
        <Link onClick={() => setMenu(false)} href="/example-report" aria-current={pathname === '/example-report' ? 'page' : undefined}>{t('Example report')}</Link><Link onClick={() => setMenu(false)} href="/#pricing">{t('Pricing & Services')}</Link>
      </nav>
      <div className={styles.controls}>
        <LanguageSwitch locale={locale} onChange={changeLocale}/>
        {session ? <details key={pathname} className={styles.account}>
          <summary>{t('Account')}</summary>
          <div><Link href="/account">{t('Account overview')}</Link><Link href="/account/reports">{t('My reports')}</Link></div>
        </details> : <Link className={styles.signIn} href="/auth/sign-in">{t('Sign In')}</Link>}
      </div>
      </div>
    </header>
    <main id="main" className={pathname === '/' ? styles.homeMain : undefined}>{children}
    </main>
      <footer className={styles.footer}><strong>NextSignal</strong><p>{t(pathname === '/' ? 'Use a test idea in this preview.' : 'Local development only. Use test ideas, not confidential business information.')}</p>
        {pathname !== '/' && <div className="trust-strip"><span>✓ {t('No external processing')}</span><span>✓ {t('Private by default')}</span><span>✓ {t('No paid APIs')}</span></div>}
        <nav aria-label={t('Footer navigation')} className={styles.footerNav}><Link href="/validate">{t('Try the free preview')}</Link><Link href="/example-report">{t('Example report')}</Link><Link href="/#pricing">{t('Pricing & Services')}</Link></nav>
      </footer>
  </Language.Provider>;
}
