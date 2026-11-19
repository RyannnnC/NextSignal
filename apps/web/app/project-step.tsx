'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProjectView, type Profile, type RunStatus } from '@nextsignal/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { reportPath } from '../lib/report-presentation';
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
  const open = useCallback(async (key: string, edit = true) => {
    const value = ProjectView.parse(await api(`projects/${key}`));
    setProject(value);
    if (edit) setProfile(value.profiles.at(-1)?.content ?? null);
  }, []);
  useEffect(() => {
    void open(id).catch(failure => {
      if (failure instanceof ClientApiError && failure.status === 401) setSignedOut(true);
      else setError('Report unavailable. It may have been deleted or belong to another account.');
    });
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
  return <div className="flow-layout">
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
          <label htmlFor="customer">{t('Intended customer — founder statement')}</label><input id="customer" value={profile.customer==='Unknown — please describe the intended customer'?t(profile.customer):profile.customer} onChange={e => setProfile({ ...profile, customer: e.target.value })} required maxLength={500} />
          <label htmlFor="problem">{t('Problem to solve — founder statement')}</label><input id="problem" value={profile.problem==='Unknown — please describe the problem to solve'?t(profile.problem):profile.problem} onChange={e => setProfile({ ...profile, problem: e.target.value })} required maxLength={1000} />
          {profile.localOpportunity && <LocalOpportunityFields value={profile.localOpportunity} onChange={localOpportunity => setProfile({ ...profile, localOpportunity })} prefix="confirm" />}
          <p className="hypothesis"><strong>{t('Hypothesis')}:</strong> {profile.assumptions.map(a=>a==='The intended customer experiences this problem. This has not been researched.'?t(a):a).join(' ')}</p><button className={canStart ? 'secondary' : undefined} disabled={busy || canStart || profile.localOpportunity?.areaIds.length === 0}>{t('Confirm corrected profile')}</button>
        </form>
        <div className="button-row">{active ? <Link className="button" href={`/validate/${id}/progress`}>{t('View research progress')}</Link>
          : <button className={canStart ? undefined : 'secondary'} disabled={busy || !canStart} onClick={() => { void act(async () => { await api(`projects/${project.id}/runs`, 'POST', { profileId: latest.id, requestKey: crypto.randomUUID() }); router.push(`/validate/${project.id}/progress`); }); }}>{t('Run fixture snapshot')}</button>}
        <button className="secondary" disabled={busy} onClick={() => { void act(async () => { await open(project.id); setMessage('Project refreshed.'); }); }}>{t('Refresh project')}</button></div>
        {!canStart && <p className="metadata">{t('Confirm the profile to enable a fixture run.')}</p>}

    </section>}
    </div>
    {mode === 'progress' && project && <section className="flow-form" aria-label={t('Research runs')}>
      <p role="status">{t(run?.status ?? 'No run has started.')}</p>
      {run && <p>{t(progressDescriptions[run.status])}</p>}
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
  </div>;
}
