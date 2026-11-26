'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { CreateProject, FIXTURE_NOTICE, Id, LOCAL_AUTH_NOTICE, LOCAL_OPPORTUNITY_EXAMPLE, LocalOpportunityInput, SYDNEY_REFERENCE_IDEA, SydneyAreaId } from '@nextsignal/contracts';
import { ArrowRightOutlined, BulbOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { LocalOpportunityFields } from './components/local-opportunity-fields';
import styles from './idea-entry.module.css';

const IdResponse = z.object({ id: Id }).strict();
const defaultOpportunity: LocalOpportunityInput = { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: ['haymarket'] };

const Draft = z.object({
  expires: z.number(), idea: z.string().max(3000), consent: z.boolean(),
  opportunity: LocalOpportunityInput.extend({ areaIds: z.array(SydneyAreaId).max(3), budgetAud: z.number().optional() }).nullable(),
  targetCustomer: z.string().max(500),
  targetRegion: z.string().max(300).default(''), budgetAud: z.string().default(''),
});
const SubmittedDraft = z.object({ expires: z.number(), input: CreateProject });
const draftKey = 'nextsignal-fixture-draft';
const draftLifetime = 15 * 60_000;
/** 渲染创意表单；只有用户同意时才在当前标签页临时保留待提交资料。 */
export function IdeaEntry() {
  const { t, realAuth } = useLanguage();
  const router = useRouter();
  const ideaInput = useRef<HTMLTextAreaElement>(null);
  const submission = useRef<{ fields: string; key: string }>(null);
  const [idea, setIdea] = useState('');
  const [consent, setConsent] = useState(false);
  const [opportunity, setOpportunity] = useState<LocalOpportunityInput | null>(null);
  const [targetCustomer, setTargetCustomer] = useState('');
  const [targetRegion, setTargetRegion] = useState('');
  const [budgetAud, setBudgetAud] = useState('');
  const [expires, setExpires] = useState<number>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        const draft = Draft.safeParse(value);
        const prior = SubmittedDraft.safeParse(value);
        const submitted = prior.success ? prior.data : undefined;
        const { targetCustomer: customer = '', ...comparison } = submitted?.input.localOpportunity ?? {};
        const saved = draft.success ? draft.data : submitted && {
          expires: submitted.expires, idea: submitted.input.idea, consent: submitted.input.processingConsent,
          opportunity: submitted.input.localOpportunity ? LocalOpportunityInput.parse(comparison) : null, targetCustomer: submitted.input.targetCustomer ?? customer,
          targetRegion: submitted.input.targetRegion ?? '', budgetAud: submitted.input.budgetAud === undefined ? '' : String(submitted.input.budgetAud),
        };
        if (saved && saved.expires > Date.now()) {
          setExpires(saved.expires);
          setIdea(saved.idea);
          setConsent(saved.consent);
          setOpportunity(saved.opportunity);
          setTargetCustomer(saved.targetCustomer);
          setTargetRegion(saved.targetRegion);
          setBudgetAud(saved.budgetAud);
        } else {
          sessionStorage.removeItem(draftKey);
        }
      }
    } catch { /* Unavailable storage does not prevent a new draft. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (expires && expires > Date.now()) {
        sessionStorage.setItem(draftKey, JSON.stringify({ expires, idea, consent, opportunity, targetCustomer, targetRegion, budgetAud }));
      } else sessionStorage.removeItem(draftKey);
    } catch {
      if (expires) { setExpires(undefined); setError('Could not keep this draft.'); }
    }
  }, [ready, expires, idea, consent, opportunity, targetCustomer, targetRegion, budgetAud]);

  useEffect(() => {
    if (!expires) return;
    const timer = window.setTimeout(() => setExpires(undefined), Math.max(0, expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expires]);

  /** 放弃草稿并同步清除当前标签页与表单中的私有内容。 */
  function discard() {
    setExpires(undefined);
    setIdea('');
    setConsent(false);
    setOpportunity(null);
    setTargetCustomer('');
    setTargetRegion('');
    setBudgetAud('');
    setError('');
    submission.current = null;
    ideaInput.current?.focus();
  }

  /** 按现有服务端契约提交项目，未登录时转到独立登录页。 */
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fields = {
        idea, geography: { country: 'AU', granularity: 'national' },
        processingConsent: consent, noticeVersion: realAuth ? 'local-auth-preview-v1' : 'local-fixture-v1',
        marketingOptIn: false,
        targetCustomer: targetCustomer.trim() || undefined,
        targetRegion: targetRegion.trim() || undefined,
        budgetAud: budgetAud === '' ? undefined : Number(budgetAud),
        ...(opportunity ? { localOpportunity: { ...opportunity, targetCustomer: targetCustomer.trim() } } : {}),
      };
      const serialized = JSON.stringify(fields);
      if (submission.current?.fields !== serialized) submission.current = { fields: serialized, key: crypto.randomUUID() };
      const input = CreateProject.parse({ ...fields, requestKey: submission.current.key });
      try {
        const { id } = IdResponse.parse(await api('projects', 'POST', input));
        try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be unavailable. */ }
        setExpires(undefined);
        router.push(`/validate/${id}/review`);
      } catch (failure) {
        if (!(failure instanceof ClientApiError) || failure.status !== 401) throw failure;
        router.push('/auth/sign-in?next=%2Fvalidate');
      }
    } catch { setError('Could not prepare your idea. Check the form and try again.'); }
    finally { setBusy(false); }
  }

  function loadExample(comparison: boolean) {
    setIdea(comparison ? LOCAL_OPPORTUNITY_EXAMPLE : SYDNEY_REFERENCE_IDEA);
    setTargetCustomer(comparison ? 'Students and young professionals' : '');
    setTargetRegion('');
    setBudgetAud('');
    setOpportunity(comparison ? { ...defaultOpportunity, areaIds: [...SydneyAreaId.options] } : null);
    ideaInput.current?.focus();
  }

  return <div className={styles.workspace}>
    <header className={styles.heading}>
      <h1>{t('Validate My Idea')}</h1>
      <p>{t('Describe your idea to see what you could test first.')}</p>
    </header>
    <aside className={styles.guide} aria-labelledby="idea-guide">
      <BulbOutlined aria-hidden="true" className={styles.bulb} />
      <h2 id="idea-guide">{t('Start with a problem')}</h2>
      <p>{t('Think of a specific person, what gets in their way and how you would help.')}</p>
      <blockquote>{t('I want to offer same-day laptop repairs to Sydney students who need their computers for class.')}</blockquote>
      <button type="button" className="secondary" disabled={!ready || busy} onClick={() => loadExample(false)}>{t('Load example')} <ArrowRightOutlined aria-hidden="true" /></button>
      <button type="button" className={styles.textButton} disabled={!ready || busy} onClick={() => loadExample(true)}>{t('Load three-area comparison example')}</button>
    </aside>
    <section className={styles.panel} aria-label={t('Describe')}>
      <p className={styles.privacy}><LockOutlined aria-hidden="true" /> {t('Private local preview. Use a test idea.')}</p>
      {error && <p className="error-banner" role="alert">{t(error)}</p>}
      {ready && <form onSubmit={create} aria-busy={busy}>
        <label className={styles.ideaLabel} htmlFor="idea">{t('Test business idea')}</label>
        <textarea ref={ideaInput} id="idea" name="idea" minLength={10} maxLength={3000} required value={idea} onChange={event => setIdea(event.target.value)} placeholder={t('What would you offer, and what problem would it solve?')} />
        <fieldset className={styles.context}>
          <legend>{t('Shape your research')} <span>{t('Optional')}</span></legend>
          <label htmlFor="target-customer">{t('Target customers')}</label>
          <input id="target-customer" maxLength={500} value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)} placeholder={t('Who would you like to help?')} />
          <div className={styles.contextRow}>
            <div><label htmlFor="target-region">{t('Target region')}</label><input id="target-region" maxLength={300} value={targetRegion} onChange={e => setTargetRegion(e.target.value)} placeholder={t('e.g. Sydney or Australia-wide')} /></div>
            <div><label htmlFor="project-budget">{t('Project budget (AUD)')}</label><input id="project-budget" type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="0.01" value={budgetAud} onChange={e => { setBudgetAud(e.target.value); if (opportunity) setOpportunity({ ...opportunity, budgetAud: e.target.value === '' ? undefined : Number(e.target.value) }); }} placeholder={t('Not decided yet')} /></div>
          </div>
        </fieldset>
        {opportunity && <fieldset className={styles.comparison}>
          <legend>{t('Sydney repair comparison options')}</legend>
          <LocalOpportunityFields value={opportunity} onChange={value => {
            setOpportunity(value);
            setBudgetAud(value.budgetAud === undefined ? '' : String(value.budgetAud));
          }} prefix="draft" />
          <button type="button" className="secondary" onClick={() => setOpportunity(null)}>{t('Remove Sydney comparison')}</button>
        </fieldset>}
        <div className={styles.consent}>
          <details className={styles.notice}>
            <summary>{t('Processing notice')}</summary>
            <p id="processing-notice">{t(realAuth ? LOCAL_AUTH_NOTICE : FIXTURE_NOTICE)}</p>
            <p>{t('Market: Australia. The preview does not measure local demand.')}</p>
          </details>
          <label className="checkbox-label"><input type="checkbox" name="consent" required checked={consent} onChange={event => setConsent(event.target.checked)} /> {t('I understand the local processing notice.')}</label>
        </div>
        <div className={styles.actions}>
          <button disabled={busy || opportunity?.areaIds.length === 0}>{t(busy ? 'Creating project…' : 'Create project and review idea')} <ArrowRightOutlined aria-hidden="true" /></button>
          {expires && <button type="button" className="secondary" onClick={discard} disabled={busy}>{t('Discard draft')}</button>}
        </div>
        <details className={styles.draft}>
          <summary>{t('Need to pause?')}</summary>
          <label className="checkbox-label"><input type="checkbox" name="saveDraft" checked={Boolean(expires)} onChange={event => setExpires(event.target.checked ? Date.now() + draftLifetime : undefined)} /> {t('Keep this draft in this tab for 15 minutes.')}</label>
        </details>
      </form>}
    </section>
  </div>;
}
