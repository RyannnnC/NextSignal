'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { CreateProject, FIXTURE_NOTICE, Id, LOCAL_AUTH_NOTICE, LOCAL_OPPORTUNITY_EXAMPLE, LocalOpportunityInput, SYDNEY_REFERENCE_IDEA, SydneyAreaId } from '@nextsignal/contracts';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { LocalOpportunityFields } from './components/local-opportunity-fields';

const IdResponse = z.object({ id: Id }).strict();
const defaultOpportunity: LocalOpportunityInput = { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: ['haymarket'] };

const Draft = z.object({
  expires: z.number(), idea: z.string().max(3000), consent: z.boolean(), marketing: z.boolean(),
  opportunity: LocalOpportunityInput.extend({ areaIds: z.array(SydneyAreaId).max(3), budgetAud: z.number().optional() }).nullable(),
  targetCustomer: z.string().max(500),
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
  const [marketing, setMarketing] = useState(false);
  const [opportunity, setOpportunity] = useState<LocalOpportunityInput | null>(null);
  const [targetCustomer, setTargetCustomer] = useState('');
  const [comparisonOpen, setComparisonOpen] = useState(false);
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
          marketing: submitted.input.marketingOptIn ?? false, opportunity: submitted.input.localOpportunity ? LocalOpportunityInput.parse(comparison) : null, targetCustomer: customer,
        };
        if (saved && saved.expires > Date.now()) {
          setExpires(saved.expires);
          setIdea(saved.idea);
          setConsent(saved.consent);
          setMarketing(saved.marketing);
          setOpportunity(saved.opportunity);
          setComparisonOpen(saved.opportunity !== null);
          setTargetCustomer(saved.targetCustomer);
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
        sessionStorage.setItem(draftKey, JSON.stringify({ expires, idea, consent, marketing, opportunity, targetCustomer }));
      } else sessionStorage.removeItem(draftKey);
    } catch {
      if (expires) { setExpires(undefined); setError('Could not keep this draft.'); }
    }
  }, [ready, expires, idea, consent, marketing, opportunity, targetCustomer]);

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
    setMarketing(false);
    setOpportunity(null);
    setComparisonOpen(false);
    setTargetCustomer('');
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
        marketingOptIn: marketing,
        ...(opportunity ? { localOpportunity: { ...opportunity, targetCustomer } } : {}),
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

  return <div className="flow-layout">
    <div><h1>{t('Validate My Idea')}</h1><p>{t('Describe what you want to test and where you plan to start.')}</p>
      <p>{t('Sign in to save your idea as a private project.')}</p>
    </div>
    <section className="flow-form" aria-label={t('Describe')}>
      {error && <p className="error-banner" role="alert">{t(error)}</p>}
      {ready && <>
        <p className="metadata" id="idea-market">{t('Market: Australia. The preview does not measure local demand.')}</p>
        <form onSubmit={create} aria-busy={busy}>
          <label htmlFor="idea">{t('Test business idea')}</label><textarea ref={ideaInput} id="idea" name="idea" minLength={10} maxLength={3000} required value={idea} onChange={event => setIdea(event.target.value)} aria-describedby="idea-market" />
          <details className="processing-notice"><summary>{t('Use an example')}</summary>
          <div className="button-row">
          <button type="button" className="secondary" disabled={busy} onClick={() => {
            setIdea(SYDNEY_REFERENCE_IDEA);
            setOpportunity(null);
            ideaInput.current?.focus();
          }}>{t('Load Sydney repair example')}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => {
            setIdea(LOCAL_OPPORTUNITY_EXAMPLE);
            setOpportunity({ ...defaultOpportunity, areaIds: [...SydneyAreaId.options] });
            setTargetCustomer('Students and young professionals');
            setComparisonOpen(true);
            ideaInput.current?.focus();
          }}>{t('Load three-area comparison example')}</button>
          </div>
          </details>
          <details className="processing-notice" open={comparisonOpen} onToggle={event => setComparisonOpen(event.currentTarget.open)}><summary>{t('Sydney repair comparison options')}</summary>
          <label className="checkbox-label"><input type="checkbox" checked={opportunity !== null} onChange={event => setOpportunity(event.target.checked ? defaultOpportunity : null)} /> {t('Compare Sydney repair locations')}</label>
          {opportunity && <>
            <label htmlFor="comparison-customer">{t('Target customer hypothesis')}</label>
            <input id="comparison-customer" value={targetCustomer} onChange={event => setTargetCustomer(event.target.value)} maxLength={500} />
            <LocalOpportunityFields value={opportunity} onChange={setOpportunity} prefix="draft" />
          </>}
          </details>
          <details className="processing-notice"><summary>{t('Processing notice')}</summary><p id="processing-notice">{t(realAuth ? LOCAL_AUTH_NOTICE : FIXTURE_NOTICE)}</p></details>
          <label className="checkbox-label"><input type="checkbox" name="consent" required checked={consent} onChange={event => setConsent(event.target.checked)} /> {t('I understand the local processing notice.')}</label>
          <label className="checkbox-label"><input type="checkbox" name="marketing" checked={marketing} onChange={event => setMarketing(event.target.checked)} /> {t('Record optional marketing interest (no messages are sent).')}</label>
          <label className="checkbox-label"><input type="checkbox" name="saveDraft" checked={Boolean(expires)} onChange={event => setExpires(event.target.checked ? Date.now() + draftLifetime : undefined)} /> {t('Keep this draft in this tab for 15 minutes.')}</label>
          <button disabled={busy || opportunity?.areaIds.length === 0}>{t(busy ? 'Creating project…' : 'Create project and review idea')}</button>
          {expires && <button type="button" className="secondary" onClick={discard} disabled={busy}>{t('Discard draft')}</button>}
        </form>
      </>}
    </section>
  </div>;
}
