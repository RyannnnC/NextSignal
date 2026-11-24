'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftOutlined, CalendarOutlined, DownOutlined, EnvironmentOutlined, FileTextOutlined, FolderOpenOutlined, HistoryOutlined, InfoCircleOutlined, LockOutlined, ProfileOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Id, isSydneyReferenceIdea } from '@nextsignal/contracts';
import { api, ClientApiError } from '../../lib/client-api';
import { presentReport, reportPath } from '../../lib/report-presentation';
import { publicExample } from '../../lib/public-example';
import { ReportView } from '../report-view';
import { ReportSummary } from './report-summary';
import { useLanguage } from './site-shell';
import styles from './report-detail.module.css';

type Presentation = NonNullable<ReturnType<typeof presentReport>>;
/** 从私有项目接口加载指定报告，并处理会话和读取失败状态。 */
export function ReportDetail({projectId,reportId}: {projectId: string;reportId: string}) {
  const {locale,t,realAuth} = useLanguage();
  const [view,setView] = useState<Presentation | null>(null);
  const [state,setState] = useState<'loading' | 'ready' | 'signin' | 'missing' | 'error'>('loading');
  const [retry,setRetry] = useState(0);
  const [fragment, setFragment] = useState('');
  const valid = Id.safeParse(projectId).success && Id.safeParse(reportId).success;
  useEffect(() => {
    let active = true;
    setView(null); setState('loading');
    if (!valid) { setState('missing'); return; }
    void api(`projects/${projectId}`).then(input => {
      if (!active) return;
      const result = presentReport(input,projectId,reportId);
      setView(result); setState(result ? 'ready' : 'missing');
    }).catch(error => {
      if (!active) return;
      setState(error instanceof ClientApiError && error.status === 401 ? 'signin' : error instanceof ClientApiError && error.status === 404 ? 'missing' : 'error');
    });
    return () => { active = false; };
  },[projectId,reportId,valid,retry]);
  // Re-check private data after returning to a tab or changing local sessions elsewhere.
  useEffect(() => {
    /** 清除当前报告视图并重新请求授权数据。 */
    const refresh = () => { setView(null); setState('loading'); setRetry(value=>value+1); };
    window.addEventListener('focus',refresh);
    return () => window.removeEventListener('focus',refresh);
  },[]);
  useEffect(() => {
    const readFragment = () => setFragment(window.location.hash.slice(1));
    readFragment();
    window.addEventListener('hashchange', readFragment);
    return () => window.removeEventListener('hashchange', readFragment);
  }, []);
  const back = <Link className={styles.back} href={valid ? `/validate/${projectId}/review` : '/validate'}>
    <ArrowLeftOutlined aria-hidden="true" />{t('Back to project')}
  </Link>;
  if (state !== 'ready' || !view || view.report.projectId !== projectId || view.report.id !== reportId) {
    return <div className={styles.layout}>{back}<h1>{t('Private preview report')}</h1>
      {state === 'loading' && <p role="status">{t('Loading report…')}</p>}
      {state === 'signin' && <section><h2>{t('Sign in to view this report')}</h2><p>{t('Reports are only available to their local account.')}</p>
        <Link className="button" href={`/auth/sign-in?next=${encodeURIComponent(reportPath(projectId,reportId))}`}>{t(realAuth ? 'Sign In' : 'Sign in locally')}</Link>
      </section>}
      {state === 'missing' && <p role="alert" className="empty">{t('Report unavailable. It may have been deleted or belong to another account.')}</p>}
      {state === 'error' && <div role="alert"><p>{t('Could not load the report. Check the local worker and try again.')}</p><button onClick={() => setRetry(value => value + 1)}>{t('Try again')}</button></div>}
    </div>;
  }

  const { report, profile, index } = view;
  const summary = Array.from((profile ?? report.referenceProfile)?.summary.replace(/\s+/g, ' ') ?? '');
  const title = summary.length > 92 ? summary.slice(0, 92).join('').trimEnd() + '…' : summary.join('');
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-AU' : 'zh-CN', { dateStyle: 'medium' });
  const geography = profile?.targetRegion || report.referenceProfile?.targetRegion || [report.geography.state, t('Australia')].filter(Boolean).join(', ');

  return <div className={styles.layout}>
    {back}
    <header className={styles.reportHeader}>
      <div className={styles.status}><span><LockOutlined aria-hidden="true" />{t('Private preview report')}</span>
        <span>{t('Includes simulated content')}</span></div>
      <h1>{t(report.referenceProfile && isSydneyReferenceIdea(title) ? publicExample.title : title || report.title)}</h1>
      <ul className={styles.meta}>
        <li><EnvironmentOutlined aria-hidden="true" />{geography}</li>
        <li><HistoryOutlined aria-hidden="true" />{t('Report version')} {index + 1}</li>
        <li><CalendarOutlined aria-hidden="true" /><time dateTime={report.createdAt}>{date.format(new Date(report.createdAt))}</time></li>
        <li><InfoCircleOutlined aria-hidden="true" />{t('Not human reviewed')}</li>
      </ul>
    </header>
    <div className={styles.grid}>
      <details className={styles.navigation}>
        <summary><UnorderedListOutlined aria-hidden="true" />{t('Jump to a section')}<DownOutlined aria-hidden="true" /></summary>
        <ReportNavigation t={t} fragment={fragment} />
      </details>
      <div className={styles.desktopNavigation}><ReportNavigation t={t} fragment={fragment} /></div>
      <div className={styles.content}>
        <ReportSummary report={report} profile={profile} locale={locale} />
        <section className={styles.overview} aria-labelledby="overview">
          <h2 id="overview" tabIndex={-1}>{t('Business Overview')}</h2>
          <p>{t('Saved founder statements from this report’s profile version.')}</p>
          {profile ? <>
            <dl>
              <div><dt>{t('Idea summary — founder statement')}</dt><dd>{profile.summary}</dd></div>
              <div><dt>{t('Intended customer — founder statement')}</dt><dd>{profile.customer}</dd></div>
              <div><dt>{t('Problem to solve — founder statement')}</dt><dd>{profile.problem}</dd></div>
            </dl>
            <h3>{t('Business Hypotheses')}</h3><ul>{profile.assumptions.map((value,index) => <li key={index}>{t(value)}</li>)}</ul>
          </> : <p className="empty">{t('The saved business profile is unavailable. The report snapshot is preserved below.')}</p>}
        </section>
        <ReportView report={report} index={index} locale={locale} />
      </div>
    </div>
  </div>;
}

const reportSections = [
  ['decision-summary', 'Summary', FileTextOutlined],
  ['overview', 'Business Overview', ProfileOutlined],
  ['report-evidence', 'Evidence and gaps', FolderOpenOutlined],
  ['report-actions', 'Validation plan', UnorderedListOutlined],
] as const;

function ReportNavigation({ t, fragment }: { t: (text: string) => string; fragment: string }) {
  const active = fragment.startsWith('action-') ? 'report-actions'
    : /^(evidence-|finding-)/.test(fragment) ? 'report-evidence' : fragment || 'decision-summary';
  return <nav aria-label={t('Report navigation')}>
    <p>{t('On this page')}</p>
    {reportSections.map(([id, label, Icon]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={event => {
      event.currentTarget.closest('details')?.removeAttribute('open');
    }}><Icon aria-hidden="true" />{t(label)}</a>)}
  </nav>;
}
