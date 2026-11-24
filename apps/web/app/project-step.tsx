'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProjectView, type Profile, type RunStatus } from '@nextsignal/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { reportPath } from '../lib/report-presentation';
import styles from './idea-entry.module.css';
import { LocalOpportunityFields } from './components/local-opportunity-fields';


const activeStatuses = new Set(['queued', 'planning', 'collecting', 'analysing', 'validating']);
const progressDescriptions: Record<RunStatus, string> = {
  queued: 'Waiting for the research worker.',
  planning: 'Preparing the research plan.',
  collecting: 'Collecting the evidence available for this case.',
  analysing: 'Organising the collected evidence.',
  validating: 'Checking the report before saving.',
  partial: 'A report is available with evidence gaps.',
  completed: 'The report is ready.',
  cancelled: 'This run was cancelled.',
  failed: 'This run could not produce a report.',
};

/** 通过既有私有项目接口读取复核或进度页面。 */
export function ProjectStep({ id, mode }: { id: string; mode: 'review' | 'progress' }) {
  const { t, realAuth } = useLanguage();
  const router = useRouter();
  const [project, setProject] = useState<ProjectView | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const open = useCallback(async (key: string, edit = true, signal?: AbortSignal) => {
    const value = ProjectView.parse(await api(`projects/${key}`, 'GET', undefined, signal));
    if (signal?.aborted) return;
    setProject(value);
    if (edit) { const content = value.profiles.at(-1)?.content; setProfile(content?.customer.startsWith('Unknown —') ? { ...content, customer: '' } : content ?? null); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void open(id, true, controller.signal).catch(failure => {
      if (controller.signal.aborted) return;
      if (failure instanceof ClientApiError && failure.status === 401) setSignedOut(true);
      else setError('Report unavailable. It may have been deleted or belong to another account.');
    });
    return () => controller.abort();
  }, [id, open]);
  const run = project?.runs.at(-1);
  const active = run && activeStatuses.has(run.status);
  useEffect(() => {
    if (mode !== 'progress' || !active) return;
    const timer = setInterval(() => void open(id, false).catch(failure => {
      if (failure instanceof ClientApiError && failure.status === 401) { setProject(null); setSignedOut(true); }
      else setError('Could not refresh run status. Use Refresh project.');
    }), 750);
    return () => clearInterval(timer);
  }, [id, open, mode, active]);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); }
    catch (failure) {
      if (failure instanceof ClientApiError && failure.status === 401) { setProject(null); setSignedOut(true); }
      else setError(failure instanceof Error ? failure.message : 'Request failed');
    } finally { setBusy(false); }
  }
  const latest = project?.profiles.at(-1);
  const canStart = latest?.status === 'confirmed' && profile === latest.content;
  const report = project?.reports.find(item => item.runId === run?.id);
  return <div className={mode === 'review' ? styles.entry : 'flow-layout'}>
    <div><h1>{t(mode === 'review' ? 'Review business profile' : 'Research runs')}</h1>
      <p>{t(mode === 'review' ? 'Check these details before starting research.' : 'Follow this research run and open its report when ready.')}</p></div>
    <div className="flow-content">
    {signedOut && <Link className="button" href={`/auth/sign-in?next=${encodeURIComponent(`/validate/${id}/${mode}`)}`}>{t(realAuth ? 'Sign In' : 'Sign in locally')}</Link>}
    {error && <p className="error-banner" role="alert">{t(error)}</p>}
    {!project && !signedOut && !error && <p role="status">{t('Loading project…')}</p>}
    {message && <p role="status">{t(message)}</p>}
    {mode === 'review' && project && profile && latest && <section className="flow-form" aria-label={t('Confirm')}>
        <p className="metadata">{t('Version')} {latest.version} — <span className="chip neutral">{t(latest.status)}</span>. {t('Prepared by a deterministic fixture. Your input is a founder statement; assumptions remain hypotheses.')}</p>
        <form onSubmit={e => { e.preventDefault(); void act(async () => { await api(`projects/${project.id}/confirm`, 'POST', { profileId: latest.id, profile, requestKey: crypto.randomUUID() }); await open(project.id); setMessage('Profile confirmed as a new version. Earlier reports remain unchanged.'); }); }}>
          <label htmlFor="summary">{t('Idea summary — founder statement')}</label><textarea id="summary" value={profile.summary} onChange={e => setProfile({ ...profile, summary: e.target.value })} required maxLength={3000} />
          <label htmlFor="customer">{t('Intended customer — founder statement')} · {t('Optional')}</label><input id="customer" value={profile.customer==='Unknown — please describe the intended customer'?t(profile.customer):profile.customer} onChange={e => setProfile({ ...profile, customer: e.target.value })} maxLength={500} />
          <div className={styles.contextRow}>
            <div><label htmlFor="target-region">{t('Target region')} · {t('Optional')}</label><input id="target-region" maxLength={300} value={profile.targetRegion ?? ''} onChange={e => setProfile({ ...profile, targetRegion: e.target.value || undefined })} /></div>
            <div><label htmlFor="project-budget">{t('Project budget (AUD)')} · {t('Optional')}</label><input id="project-budget" type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="0.01" value={profile.budgetAud ?? ''} onChange={e => setProfile({ ...profile, budgetAud: e.target.value === '' ? undefined : Number(e.target.value), ...(profile.localOpportunity ? { localOpportunity: { ...profile.localOpportunity, budgetAud: e.target.value === '' ? undefined : Number(e.target.value) } } : {}) })} /></div>
          </div>
          <label htmlFor="problem">{t('Problem to solve — founder statement')}</label><input id="problem" value={profile.problem==='Unknown — please describe the problem to solve'?t(profile.problem):profile.problem} onChange={e => setProfile({ ...profile, problem: e.target.value })} required maxLength={1000} />
          {profile.localOpportunity && <LocalOpportunityFields value={profile.localOpportunity} onChange={localOpportunity => setProfile({ ...profile, localOpportunity, budgetAud: localOpportunity.budgetAud })} prefix="confirm" />}
          <p className="hypothesis"><strong>{t('Hypothesis')}:</strong> {profile.assumptions.map(a=>a==='The intended customer experiences this problem. This has not been researched.'?t(a):a).join(' ')}</p><button className={canStart ? 'secondary' : undefined} disabled={busy || canStart || profile.localOpportunity?.areaIds.length === 0}>{t('Confirm corrected profile')}</button>
        </form>
        <div className="button-row">{active ? <Link className="button" href={`/validate/${id}/progress`}>{t('View research progress')}</Link>
          : <button className={canStart ? undefined : 'secondary'} disabled={busy || !canStart} onClick={() => { void act(async () => { await api(`projects/${project.id}/runs`, 'POST', { profileId: latest.id, requestKey: crypto.randomUUID() }); router.push(`/validate/${project.id}/progress`); }); }}>{t('Generate preview report')}</button>}
        <button className="secondary" disabled={busy} onClick={() => { void act(async () => { await open(project.id); setMessage('Project refreshed.'); }); }}>{t('Refresh project')}</button></div>
        {!canStart && <p className="metadata">{t('Confirm the profile to generate a preview report.')}</p>}

    </section>}
    {mode === 'progress' && project && <section className="flow-form" aria-label={t('Research runs')}>
      <p role="status">{t(run ? progressDescriptions[run.status] : 'No run has started.')}</p>
      {run?.errorCode && <p role="alert">{t(run.errorCode)}</p>}
      {active && <button className="secondary" disabled={busy} onClick={() => void act(async () => {
        await api(`projects/${id}/cancel`, 'POST', { runId: run.id });
        await open(id, false);
      })}>{t('Cancel run')}</button>}
      <div className="button-row">
        {report && <Link className="button" href={reportPath(id, report.id)}>{t('Open current report')}</Link>}
        {active && <button className="secondary" disabled={busy} onClick={() => void act(() => open(id, false))}>{t('Refresh project')}</button>}
        {(!active || error) && <Link className="button secondary" href={`/validate/${id}/review`}>{t('Back to project')}</Link>}
      </div>
      {(run?.status === 'failed' || run?.status === 'cancelled') && <p>{t('Return to review to start a new run.')}</p>}
    </section>}
    </div>
  </div>;
}
