'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Locale, translate } from '../../lib/i18n';
import { LanguageSwitch } from '../language-switch';
import styles from './site-shell.module.css';

const Language = createContext<{locale: Locale; t: (text: string) => string} | null>(null);
/** 从站点上下文获取当前语言和翻译函数。 */
export function useLanguage() {
  const value = useContext(Language);
  if (!value) throw new Error('SiteShell is required');
  return value;
}
/** 提供全站布局及语言偏好。 */
export function SiteShell({children}: {children: ReactNode}) {
  const [locale, setLocale] = useState<Locale>('en');
  const pathname = usePathname();
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
      document.title = `NextSignal — ${translate(locale, pathname.startsWith('/projects/') ? 'Private fixture report' : pathname === '/validate' ? 'Local fixture workspace' : 'Grow My Business')}`;
    }
  }, [locale, pathname]);
  /** 更新语言状态，并尽可能保存到本地。 */
  function changeLocale(value: Locale) {
    setLocale(value);
    try { localStorage.setItem('next-signal-language', value); } catch { /* In-memory switching remains available. */ }
  }
  return <Language.Provider value={{locale,t}}>
    <a className="skip" href="#main">{t('Skip to content')}</a>
    <header className={`site-header ${styles.header}`}>
      <Link className="wordmark" href="/" aria-label="NextSignal">Next<span>Signal</span><span className="brand-dot" aria-hidden="true"/></Link>
      <nav aria-label={t('Main navigation')} className={styles.nav}>
        <Link href="/validate" aria-current={pathname === '/validate' ? 'page' : undefined}>{t('Validate My Idea')}</Link>
        <Link href="/grow" aria-current={pathname === '/grow' ? 'page' : undefined}>{t('Grow My Business')}</Link>
        <Link href="/#research">{t('Example report')}</Link><Link href="/#pricing">{t('Pricing & Services')}</Link>
      </nav>
      <LanguageSwitch locale={locale} onChange={changeLocale}/>
    </header>
    <main id="main" className={pathname === '/' ? styles.homeMain : undefined}>{children}
      <footer><strong>NextSignal</strong><p>{t(pathname === '/' ? 'Use a test idea in this preview.' : 'Local development only. Use test ideas, not confidential business information.')}</p>
        {pathname !== '/' && <div className="trust-strip"><span>✓ {t('No external processing')}</span><span>✓ {t('Private by default')}</span><span>✓ {t('No paid APIs')}</span></div>}
        <nav aria-label={t('Footer navigation')} className={styles.footerNav}><Link href="/validate">{t('Start Free')}</Link><Link href="/#research">{t('Example report')}</Link><Link href="/#pricing">{t('Pricing & Services')}</Link></nav>
      </footer>
    </main>
  </Language.Provider>;
}
