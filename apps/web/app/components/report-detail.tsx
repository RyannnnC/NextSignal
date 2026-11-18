'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Id } from '@nextsignal/contracts';
import { api, ClientApiError } from '../../lib/client-api';
import { presentReport, reportPath } from '../../lib/report-presentation';
import { ReportView } from '../report-view';
import { ReportSummary } from './report-summary';
import { useLanguage } from './site-shell';

type Presentation = NonNullable<ReturnType<typeof presentReport>>;
/** 从私有项目接口加载指定报告，并处理会话和读取失败状态。 */
export function ReportDetail({projectId,reportId}: {projectId: string;reportId: string}) {
  const {locale,t} = useLanguage();
  const [view,setView] = useState<Presentation | null>(null);
  const [state,setState] = useState<'loading' | 'ready' | 'signin' | 'missing' | 'error'>('loading');
  const [retry,setRetry] = useState(0);
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
  return <div className="report-layout"><h1>{t('Private fixture report')}</h1>
    <p>{t('Private by default')} · {t('Not human reviewed')}</p>
    {state === 'loading' && <p role="status">{t('Loading report…')}</p>}
    {state === 'signin' && <section><h2>{t('Sign in to view this report')}</h2><p>{t('Reports are only available to their local account.')}</p><Link className="button" href={`/auth/sign-in?next=${encodeURIComponent(reportPath(projectId,reportId))}`}>{t('Sign in locally')}</Link></section>}
    {state === 'missing' && <p role="alert" className="empty">{t('Report unavailable. It may have been deleted or belong to another account.')}</p>}
    {state === 'error' && <div role="alert"><p>{t('Could not load the report. Check the local worker and try again.')}</p><button onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</button></div>}
    {state === 'ready' && view && view.report.projectId === projectId && view.report.id === reportId && <div className="report-grid">
      <nav className="report-nav" aria-label={t('Report navigation')}>
        <a href="#decision-summary">{t('Summary')}</a><a href="#overview">{t('Business Overview')}</a><a href="#report-evidence">{t('Evidence')}</a><a href="#report-actions">{t('Next steps')}</a>
      </nav><div>
      <ReportSummary t={t} localRepair={Boolean(view.report.referenceProfile)} />
      <section aria-labelledby="overview"><h2 id="overview">{t('Business Overview')}</h2>
        <p>{t('Saved founder statements from this report’s profile version.')}</p>
        {view.profile ? <><dl>
          <div><dt>{t('Idea summary — founder statement')}</dt><dd>{view.profile.summary}</dd></div>
          <div><dt>{t('Intended customer — founder statement')}</dt><dd>{view.profile.customer}</dd></div>
          <div><dt>{t('Problem to solve — founder statement')}</dt><dd>{view.profile.problem}</dd></div>
        </dl><h3>{t('Business Hypotheses')}</h3><ul>{view.profile.assumptions.map((value,index)=><li key={index}>{t(value)}</li>)}</ul></> : <p className="empty">{t('The saved business profile is unavailable. The report snapshot is preserved below.')}</p>}
      </section>
      <ReportView report={view.report} index={view.index} locale={locale}/>
      </div>
    </div>}
    <Link className="text-action" href={valid ? `/validate/${projectId}/review` : '/validate'}>{t('Back to project')}</Link>
  </div>;
}
