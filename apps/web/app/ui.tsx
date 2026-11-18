'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { CreateProject, FIXTURE_NOTICE, LOCAL_OPPORTUNITY_EXAMPLE, LocalOpportunityInput, SYDNEY_REFERENCE_IDEA, SydneyAreaId } from '@nextsignal/contracts';
import { useRouter } from 'next/navigation';
import { useLanguage } from './components/site-shell';
import { api, ClientApiError } from '../lib/client-api';
import { LocalOpportunityFields } from './components/local-opportunity-fields';

const IdResponse = z.object({ id: z.uuid() }).strict();
const defaultOpportunity: LocalOpportunityInput = { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: ['haymarket'] };

const Draft = z.object({ expires: z.number(), input: CreateProject });
const draftKey = 'nextsignal-fixture-draft';
type Draft = z.infer<typeof Draft>;
/** 渲染创意表单；只有用户同意时才在当前标签页临时保留待提交资料。 */
export function IdeaEntry() {
  const { t } = useLanguage();
  const router = useRouter();
  const ideaInput = useRef<HTMLTextAreaElement>(null);
  const [opportunity, setOpportunity] = useState<LocalOpportunityInput | null>(null);
  const [targetCustomer, setTargetCustomer] = useState('');
  const [draft, setDraft] = useState<Draft>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      sessionStorage.removeItem(draftKey);
      if (raw) {
        const saved = Draft.parse(JSON.parse(raw));
        if (saved.expires > Date.now()) {
          setDraft(saved);
          const comparison = saved.input.localOpportunity;
          if (comparison) {
            const { targetCustomer, ...fields } = comparison;
            setOpportunity(fields);
            setTargetCustomer(targetCustomer);
          }
        }
      }
    } catch { /* Malformed or inaccessible storage does not prevent a new draft. */ }
    setReady(true);
  }, []);

  /** 按现有服务端契约提交项目，未登录时转到独立登录页。 */
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const input = CreateProject.parse({
        idea: data.get('idea'), geography: { country: 'AU', granularity: 'national' },
        processingConsent: data.get('consent') === 'on', noticeVersion: 'local-fixture-v1',
        marketingOptIn: data.get('marketing') === 'on', requestKey: crypto.randomUUID(),
        ...(opportunity ? { localOpportunity: { ...opportunity, targetCustomer } } : {}),
      });
      try {
        await api('session');
        const { id } = IdResponse.parse(await api('projects', 'POST', input));
        router.push(`/validate/${id}/review`);
      } catch (failure) {
        if (!(failure instanceof ClientApiError) || failure.status !== 401) throw failure;
        if (data.get('saveDraft') === 'on') {
          try { sessionStorage.setItem(draftKey, JSON.stringify({ expires: Date.now() + 15 * 60_000, input })); }
          catch { setError('Could not keep this draft.'); return; }
        }
        router.push('/auth/sign-in?next=%2Fvalidate');
      }
    } catch { setError('Could not prepare your idea. Check the form and try again.'); }
    finally { setBusy(false); }
  }

  return <div className="flow-layout">
    <div><h1>{t('Validate My Idea')}</h1><p>{t('Describe what you want to test and where you plan to start.')}</p></div>
    <section className="flow-form" aria-label={t('Describe')}>
      {error && <p className="error-banner" role="alert">{t(error)}</p>}
      {ready && <>
        <p className="metadata" id="idea-market">{t('Market: Australia. This fixture supplies no state or city demand data.')}</p>
        <form onSubmit={create}>
          <label htmlFor="idea">{t('Test business idea')}</label><textarea ref={ideaInput} id="idea" name="idea" minLength={10} maxLength={3000} required defaultValue={draft?.input.idea} aria-describedby="idea-market" />
          <div className="button-row">
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
          </div>
          <label className="checkbox-label"><input type="checkbox" checked={opportunity !== null} onChange={event => setOpportunity(event.target.checked ? defaultOpportunity : null)} /> {t('Compare Sydney repair locations')}</label>
          {opportunity && <>
            <label htmlFor="comparison-customer">{t('Target customer hypothesis')}</label>
            <input id="comparison-customer" value={targetCustomer} onChange={event => setTargetCustomer(event.target.value)} required maxLength={500} />
            <LocalOpportunityFields value={opportunity} onChange={setOpportunity} prefix="draft" />
          </>}
          <details className="processing-notice"><summary>{t('Processing notice')}</summary><p id="processing-notice">{t(FIXTURE_NOTICE)}</p></details>
          <label className="checkbox-label"><input type="checkbox" name="consent" required /> {t('I understand the local processing notice.')}</label>
          <label className="checkbox-label"><input type="checkbox" name="marketing" defaultChecked={draft?.input.marketingOptIn} /> {t('Record optional marketing interest (no messages are sent).')}</label>
          <label className="checkbox-label"><input type="checkbox" name="saveDraft" /> {t('Keep this draft in this tab for 15 minutes if sign-in is needed.')}</label>
          <button disabled={busy || opportunity?.areaIds.length === 0}>{t('Prepare fixture profile')}</button>
        </form>
      </>}
    </section>
  </div>;
}
