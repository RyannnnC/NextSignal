'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { FIXTURE_NOTICE, LOCAL_OPPORTUNITY_EXAMPLE, LocalOpportunityInput, ProjectView, SessionView, SYDNEY_REFERENCE_IDEA, SydneyAreaId, type Profile, type Scenario } from '@nextsignal/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api } from '../lib/client-api';
import { reportPath } from '../lib/report-presentation';
import { LocalOpportunityFields } from './components/local-opportunity-fields';

const IdResponse = z.object({ id: z.uuid() }).strict();
const defaultOpportunity: LocalOpportunityInput = { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: ['haymarket'] };
/** 管理本地 M1 的登录、项目确认和研究状态。 */
export function FixtureApp({initialProjectId, returnTo}: {initialProjectId?: string | undefined; returnTo?: string | undefined}) {
  const {t} = useLanguage();
  const router = useRouter();
  const [session, setSession] = useState<z.infer<typeof SessionView> | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Checking local session…');
  const [error, setError] = useState('');
  const ideaInput = useRef<HTMLTextAreaElement>(null);
  const [opportunity, setOpportunity] = useState<LocalOpportunityInput | null>(null);
  const [targetCustomer, setTargetCustomer] = useState('');
  /** 从服务端刷新当前用户可见的项目列表。 */
  const refreshList = useCallback(async () => {
    setProjects(z.object({ ids: z.array(z.uuid()) }).parse(await api('projects')).ids);
  }, []);
  /** 打开指定项目，必要时用最新资料初始化表单。 */
  const open = useCallback(async (id: string, edit = true) => {
    const value = ProjectView.parse(await api(`projects/${id}`));
    setProject(value);
    if (edit) setProfile(value.profiles.at(-1)?.content ?? null);
  }, []);
  useEffect(() => {
    void (async () => {
      try {
        setSession(SessionView.parse(await api('session'))); await refreshList(); setMessage('Local session ready.');
      }
      catch { setMessage('Choose a local fixture account to begin.'); return; }
      if (returnTo) router.replace(returnTo);
      else if (initialProjectId) {
        try { await open(initialProjectId); }
        catch (error) { setError(error instanceof Error ? error.message : 'Request failed'); }
      }
    })();
  }, [refreshList, initialProjectId, returnTo, router, open]);
  const activeRun = project?.runs.find(r => ['queued', 'planning', 'collecting', 'analysing', 'validating'].includes(r.status));
  useEffect(() => {
    if (!project || !activeRun) return;
    const id = project.id;
    const timer = setInterval(() => { void open(id, false).catch(() => setError('Could not refresh run status. Use Refresh project.')); }, 750);
    return () => clearInterval(timer);
  }, [project?.id, activeRun?.id, open]);
  /** 统一处理用户操作的忙碌状态和错误反馈。 */
  async function act(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); } finally { setBusy(false); }
  }
  /** 从表单读取创意和同意项，提交新的 fixture 项目。 */
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    void act(async () => {
      const result = IdResponse.parse(await api('projects', 'POST', { idea: data.get('idea'), geography: { country: 'AU', granularity: 'national' }, processingConsent: data.get('consent') === 'on', noticeVersion: 'local-fixture-v1', marketingOptIn: data.get('marketing') === 'on', scenario: opportunity ? 'normal' : data.get('scenario') as Scenario, requestKey: crypto.randomUUID(), ...(opportunity ? { localOpportunity: { ...LocalOpportunityInput.parse(opportunity), targetCustomer } } : {}) }));
      await refreshList(); await open(result.id); setMessage('Profile placeholder prepared. Correct and confirm before research.'); form.reset();
      setOpportunity(null); setTargetCustomer('');
    });
  }
  const latest = project?.profiles.at(-1);
  return <div className="workspace">
    <h1>{t('Validate My Idea')}</h1><p>{t('Local fixture — no real market research, AI inference, payments or website crawling.')}</p>
    <p className="status-banner" role="status" aria-live="polite">{t(busy ? 'Request in progress…' : message)}</p>
    {error && <p className="error-banner" role="alert">{t('Request failed')}: {t(error)}</p>}
    {!session ? <section aria-labelledby="signin"><p className="eyebrow">M1 / {t('Private by default')}</p><h2 id="signin">{t('Local fixture sign in')}</h2><p>{t('These test identities have no password. This mode must stay on your own computer.')}</p>
        <form onSubmit={e => { e.preventDefault(); const account = new FormData(e.currentTarget).get('account'); void act(async () => { setSession(SessionView.parse(await api('session', 'POST', { account }))); await refreshList(); setMessage('Signed in to local fixture account.'); if (returnTo) router.replace(returnTo); else if (initialProjectId) await open(initialProjectId); }); }}>
        <label htmlFor="account">{t('Fixture account')}</label><select id="account" name="account"><option value="alice">Alice</option><option value="bob">Bob</option></select><button disabled={busy}>{t('Sign in locally')}</button>
      </form></section> : <>
      <div className="account-bar"><p>{t('Fixture account')}: <strong>{session.account}</strong></p>
      <button className="secondary" disabled={busy} onClick={() => { void act(async () => { await api('session', 'DELETE'); setSession(null); setProject(null); setProfile(null); setProjects([]); setMessage('Signed out.'); }); }}>{t('Sign out')}</button></div>
      <section aria-labelledby="new-project"><p className="eyebrow">01 / {t('Describe')}</p><h2 id="new-project">{t('Validate My Idea')}</h2>
        <details className="processing-notice" open><summary>{t('Processing notice')}</summary><p id="processing-notice">{t(FIXTURE_NOTICE)}</p></details><p className="metadata">{t('Market: Australia. This fixture supplies no state or city demand data.')}</p>
        <form onSubmit={create}>
          <label htmlFor="idea">{t('Test business idea')}</label><textarea ref={ideaInput} id="idea" name="idea" minLength={10} maxLength={3000} required aria-describedby="processing-notice" />
          <button type="button" className="secondary" disabled={busy} onClick={() => {
            const input = ideaInput.current;
            if (input) { input.value = SYDNEY_REFERENCE_IDEA; input.focus(); }
            setOpportunity(null);
          }}>{t('Load Sydney repair example')}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => {
            if (ideaInput.current) ideaInput.current.value = LOCAL_OPPORTUNITY_EXAMPLE;
            setOpportunity({ ...defaultOpportunity, areaIds: [...SydneyAreaId.options] });
            setTargetCustomer('Students and young professionals');
          }}>{t('Load three-area comparison example')}</button>
          <label className="checkbox-label"><input type="checkbox" checked={opportunity !== null} onChange={event => setOpportunity(event.target.checked ? defaultOpportunity : null)} /> {t('Compare Sydney repair locations')}</label>
          {opportunity && <>
            <label htmlFor="comparison-customer">{t('Target customer hypothesis')}</label>
            <input id="comparison-customer" value={targetCustomer} onChange={event => setTargetCustomer(event.target.value)} required maxLength={500} />
            <LocalOpportunityFields value={opportunity} onChange={setOpportunity} prefix="draft" />
          </>}
          <label className="checkbox-label"><input type="checkbox" name="consent" required /> {t('I understand the local processing notice.')}</label>
          <label className="checkbox-label"><input type="checkbox" name="marketing" /> {t('Record optional marketing interest (no messages are sent).')}</label>
          {!opportunity && <><label htmlFor="scenario">{t('Development fixture scenario')}</label><select id="scenario" name="scenario">{['normal', 'missing', 'contradictory', 'timeout', 'malformed', 'quota'].map(s => <option key={s} value={s}>{t(s)}</option>)}</select></>}
          <button disabled={busy || opportunity?.areaIds.length === 0}>{t('Prepare fixture profile')}</button>
        </form>
      </section>
      <section aria-labelledby="projects"><h2 id="projects">{t('Private local projects')}</h2>{projects.length === 0 && <p className="empty">{t('No projects yet.')}</p>}{projects.map((id, i) => <button className="secondary" key={id} disabled={busy} onClick={() => { void act(async () => { await open(id); setMessage('Project loaded.'); }); }}>{t('Open project')} {i + 1}</button>)}</section>
      {project && profile && latest && <section aria-labelledby="profile"><p className="eyebrow">02 / {t('Confirm')}</p><h2 id="profile">{t('Review business profile')}</h2>
        <p className="metadata">{t('Version')} {latest.version} — <span className="chip neutral">{t(latest.status)}</span>. {t('Prepared by a deterministic fixture. Your input is a founder statement; assumptions remain hypotheses.')}</p>
        <form onSubmit={e => { e.preventDefault(); void act(async () => { await api(`projects/${project.id}/confirm`, 'POST', { profileId: latest.id, profile, requestKey: crypto.randomUUID() }); await open(project.id); setMessage('Profile confirmed as a new version. Earlier reports remain unchanged.'); }); }}>
          <label htmlFor="summary">{t('Idea summary — founder statement')}</label><textarea id="summary" value={profile.summary} onChange={e => setProfile({ ...profile, summary: e.target.value })} required maxLength={3000} />
          <label htmlFor="customer">{t('Intended customer — founder statement')}</label><input id="customer" value={profile.customer==='Unknown — please describe the intended customer'?t(profile.customer):profile.customer} onChange={e => setProfile({ ...profile, customer: e.target.value })} required maxLength={500} />
          <label htmlFor="problem">{t('Problem to solve — founder statement')}</label><input id="problem" value={profile.problem==='Unknown — please describe the problem to solve'?t(profile.problem):profile.problem} onChange={e => setProfile({ ...profile, problem: e.target.value })} required maxLength={1000} />
          {profile.localOpportunity && <LocalOpportunityFields value={profile.localOpportunity} onChange={localOpportunity => setProfile({ ...profile, localOpportunity })} prefix="confirm" />}
          <p className="hypothesis"><strong>{t('Hypothesis')}:</strong> {profile.assumptions.map(a=>a==='The intended customer experiences this problem. This has not been researched.'?t(a):a).join(' ')}</p><button disabled={busy || profile.localOpportunity?.areaIds.length === 0}>{t('Confirm corrected profile')}</button>
        </form>
        <div className="button-row"><button disabled={busy || latest.status !== 'confirmed'} onClick={() => { void act(async () => { await api(`projects/${project.id}/runs`, 'POST', { profileId: latest.id, requestKey: crypto.randomUUID() }); await open(project.id, false); setMessage('Fixture run queued.'); }); }}>{t('Run fixture snapshot')}</button>
        <button className="secondary" disabled={busy} onClick={() => { void act(async () => { await open(project.id); setMessage('Project refreshed.'); }); }}>{t('Refresh project')}</button></div>
        {latest.status !== 'confirmed' && <p className="metadata">{t('Confirm the profile to enable a fixture run.')}</p>}
        <div className="project-controls"><button className="danger secondary" disabled={busy} onClick={() => { void act(async () => { await api(`projects/${project.id}`, 'DELETE'); setProject(null); setProfile(null); await refreshList(); setMessage('Project input, versions, runs and reports deleted from the local database.'); }); }}>{t('Delete project and reports')}</button></div>
        <h3>{t('Research runs')}</h3>{project.runs.length === 0 && <p>{t('No run has started.')}</p>}{project.runs.map(run => <p className="run-status" key={run.id}>{t('Status')}: <strong>{t(run.status)}</strong>{run.errorCode && ` — ${t(run.errorCode)}`}{!['completed', 'partial', 'failed', 'cancelled'].includes(run.status) && <button className="secondary" disabled={busy} onClick={() => { void act(async () => { await api(`projects/${project.id}/cancel`, 'POST', { runId: run.id }); await open(project.id, false); setMessage('Run cancelled.'); }); }}>{t('Cancel run')}</button>}</p>)}
        <h3>{t('Report versions')}</h3>{project.reports.length === 0 && <p className="empty">{t('No report yet. Failed runs do not fabricate a report.')}</p>}
        {project.reports.map((report,index)=><article key={report.id} aria-label={`${t('Fixture report')} ${index+1}`}><h4>{t('Fixture report')} {index+1}</h4><p>{t(report.evidence.some(item => item.provider === 'abs') ? 'Development report with ABS data' : 'Synthetic fixture')} · {t('Not human reviewed')}</p><Link className="button" href={reportPath(project.id,report.id)}>{t('View report')} {index+1}</Link></article>)}
      </section>}
    </>}
    </div>;
}
