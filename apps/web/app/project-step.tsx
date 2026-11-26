'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Id, ProjectView, type Profile, type RunStatus } from '@nextsignal/contracts';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { reportPath } from '../lib/report-presentation';
import styles from './idea-entry.module.css';
import { LocalOpportunityFields } from './components/local-opportunity-fields';
import { FileSearchOutlined, FormOutlined } from '@ant-design/icons';


const IdResponse = z.object({ id: Id });
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
  const { t, realAuth, locale } = useLanguage();
  const router = useRouter();
  const [project, setProject] = useState<ProjectView | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const generation = useRef<{ fields: string; confirmKey: string; runKey: string }>(null);
  const open = useCallback(async (key: string, edit = true, isCurrent?: () => boolean) => {
    const value = ProjectView.parse(await api(`projects/${key}`));
    if (isCurrent && !isCurrent()) return;
    setProject(value);
    if (edit) { const content = value.profiles.at(-1)?.content; setProfile(content?.customer.startsWith('Unknown —') ? { ...content, customer: '' } : content ?? null); }
  }, []);
  useEffect(() => {
    let current = true;
    void open(id, true, () => current).catch(failure => {
      if (!current) return;
      if (failure instanceof ClientApiError && failure.status === 401) setSignedOut(true);
      else setError('Report unavailable. It may have been deleted or belong to another account.');
    });
    return () => { current = false; };
  }, [id, open]);
  const run = project?.runs.at(-1);
  const active = run && activeStatuses.has(run.status);
  useEffect(() => {
    if (mode !== 'progress' || !active) return;
    let current = true;
    const timer = setInterval(() => void open(id, false, () => current).catch(failure => {
      if (!current) return;
      if (failure instanceof ClientApiError && failure.status === 401) { setProject(null); setSignedOut(true); }
      else setError('Could not refresh run status. Use Refresh project.');
    }), 750);
    return () => { current = false; clearInterval(timer); };
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
  const unchanged = latest?.status === 'confirmed' && JSON.stringify(profile) === JSON.stringify(latest.content);
  const currentReport = project?.reports.filter(item => item.profileId === latest?.id).at(-1);
  const report = project?.reports.find(item => item.runId === run?.id);

  async function generate() {
    if (!profile || !latest) return;
    const fields = JSON.stringify({ id, profileId: latest.id, profile });
    if (generation.current?.fields !== fields) {
      generation.current = { fields, confirmKey: crypto.randomUUID(), runKey: crypto.randomUUID() };
    }
    const { confirmKey, runKey } = generation.current;
    const profileId = unchanged ? latest.id : IdResponse.parse(await api(`projects/${id}/confirm`, 'POST', {
      profileId: latest.id, profile, requestKey: confirmKey,
    })).id;
    await api(`projects/${id}/runs`, 'POST', { profileId, requestKey: runKey });
    router.push(`/validate/${id}/progress`);
  }
  return <div className={styles.entry}>
    <h1>{t(mode === 'review' ? 'Research brief' : 'Report progress')}</h1>
    <div className="flow-content">
    {signedOut && <Link className="button" href={`/auth/sign-in?next=${encodeURIComponent(`/validate/${id}/${mode}`)}`}>{t(realAuth ? 'Sign In' : 'Sign in locally')}</Link>}
    {error && <p className="error-banner" role="alert">{t(error)}</p>}
    {!project && !signedOut && !error && <p role="status">{t('Loading project…')}</p>}
    {mode === 'review' && project && profile && latest && <section className="flow-form" aria-label={t('Confirm')}>
        <form onSubmit={event => { event.preventDefault(); if (!busy && !active && !(unchanged && currentReport)) void act(generate); }}>
          <div className={styles.brief}>
            <h2>{t('Your idea')}</h2>
            <p>{profile.summary}</p>
            <dl>
              <div><dt>{t('Target customers')}</dt><dd>{profile.customer || t('Not decided yet')}</dd></div>
              <div><dt>{t('Target region')}</dt><dd>{profile.targetRegion || t('Not decided yet')}</dd></div>
              <div><dt>{t('Project budget (AUD)')}</dt><dd>{profile.budgetAud === undefined ? t('Not decided yet') : new Intl.NumberFormat(locale, { style: 'currency', currency: 'AUD' }).format(profile.budgetAud)}</dd></div>
            </dl>
          </div>
          <details className={styles.briefEdit}>
          <summary>{t('Edit project details')}</summary>
          <label htmlFor="summary">{t('Idea summary — founder statement')}</label><textarea id="summary" value={profile.summary} onChange={e => setProfile({ ...profile, summary: e.target.value })} onInvalid={e => e.currentTarget.closest('details')?.setAttribute('open', '')} required maxLength={3000} />
          <label htmlFor="customer">{t('Intended customer — founder statement')} · {t('Optional')}</label><input id="customer" value={profile.customer==='Unknown — please describe the intended customer'?t(profile.customer):profile.customer} onChange={e => setProfile({ ...profile, customer: e.target.value })} maxLength={500} />
          <div className={styles.contextRow}>
            <div><label htmlFor="target-region">{t('Target region')} · {t('Optional')}</label><input id="target-region" maxLength={300} value={profile.targetRegion ?? ''} onChange={e => setProfile({ ...profile, targetRegion: e.target.value || undefined })} /></div>
            <div><label htmlFor="project-budget">{t('Project budget (AUD)')} · {t('Optional')}</label><input id="project-budget" type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="0.01" value={profile.budgetAud ?? ''} onChange={e => setProfile({ ...profile, budgetAud: e.target.value === '' ? undefined : Number(e.target.value), ...(profile.localOpportunity ? { localOpportunity: { ...profile.localOpportunity, budgetAud: e.target.value === '' ? undefined : Number(e.target.value) } } : {}) })} /></div>
          </div>
          {profile.localOpportunity && <LocalOpportunityFields value={profile.localOpportunity} onChange={localOpportunity => setProfile({ ...profile, localOpportunity, budgetAud: localOpportunity.budgetAud })} prefix="confirm" />}
          </details>
          <div className={styles.focus}>
            <label htmlFor="research-focus"><FormOutlined aria-hidden="true" /> {t('Research focus and constraints')} <span>{t('Optional')}</span></label>
            <textarea id="research-focus" maxLength={500} value={profile.researchFocus ?? ''} onChange={event => setProfile({ ...profile, researchFocus: event.target.value || undefined })} placeholder={t('e.g. Can I test demand on weekends without paying for ads?')} />
          </div>
          <div className="button-row">
            {active ? <Link className="button" href={`/validate/${id}/progress`}>{t('View research progress')}</Link>
              : unchanged && currentReport ? <Link className="button" href={reportPath(id, currentReport.id)}>{t('Open current report')}</Link>
              : <button disabled={busy || profile.localOpportunity?.areaIds.length === 0}>
                  {t(busy ? 'Starting research…' : project.reports.length ? 'Update preview report' : 'Generate preview report')}
                </button>}
          </div>
        </form>

    </section>}
    {mode === 'progress' && project && <section className="flow-form" aria-label={t('Research runs')}>
      <div className={styles.runStatus} role="status">
        {active && <h2><FileSearchOutlined aria-hidden="true" /> {t('Generating your report')}</h2>}
        <p>{t(run ? progressDescriptions[run.status] : 'No run has started.')}</p>
        {active && <div className={styles.activityTrack} aria-hidden="true"><span /></div>}
      </div>
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
