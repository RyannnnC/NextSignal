'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { ProjectView, SessionView } from '@nextsignal/contracts';
import { api, ClientApiError, requestAuth } from '../../lib/client-api';
import { reportPath } from '../../lib/report-presentation';
import { useLanguage } from './site-shell';

const IdList = z.object({ ids: z.array(z.uuid()) });
const pageSize = 6;

/** 使用既有 fixture 会话接口登录，并回到已校验的站内路径。 */
export function FixtureSignIn({ returnTo }: { returnTo: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = new FormData(event.currentTarget).get('account');
    setBusy(true); setError(false);
    try {
      SessionView.parse(await api('session', 'POST', { account }));
      router.replace(returnTo);
    } catch { setError(true); setBusy(false); }
  }
  return <div className="flow-layout">
    <div><h1>{t('Local fixture sign in')}</h1><p>{t('These test identities have no password. This mode must stay on your own computer.')}</p></div>
    <section className="flow-form" aria-label={t('Local fixture sign in')}>
      {error && <p role="alert">{t('Could not sign in. Try again.')}</p>}
      <form onSubmit={signIn}>
        <label htmlFor="account">{t('Fixture account')}</label>
        <select id="account" name="account"><option value="alice">Alice</option><option value="bob">Bob</option></select>
        <button disabled={busy}>{t('Sign in locally')}</button>
      </form>
    </section>
  </div>;
}

/** 使用原有私有 API 分页展示项目与报告。 */
export function AccountPage({ history }: { history: boolean }) {
  const { t, locale, realAuth } = useLanguage();
  const router = useRouter();
  const [session, setSession] = useState<z.infer<typeof SessionView>>();
  const [ids, setIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      const identity = SessionView.parse(await api('session'));
      const keys = history ? IdList.parse(await api('projects')).ids : [];
      const entries = await Promise.all(keys.slice(page * pageSize, (page + 1) * pageSize).map(async id => {
        try { return ProjectView.parse(await api(`projects/${id}`)); }
        catch (failure) {
          if (failure instanceof ClientApiError && failure.status === 404) return null;
          throw failure;
        }
      }));
      if (active) { setSession(identity); setIds(keys); setProjects(entries.filter(entry => entry !== null)); }
    })().catch(failure => {
      if (!active) return;
      setSession(undefined); setProjects([]);
      setError(!(failure instanceof ClientApiError && failure.status === 401));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [history, page]);
  return <div className="flow-layout">
    <div><h1>{t(history ? 'My reports' : 'Account')}</h1><p>{t(history ? 'Reopen a private report or continue a saved project.' : realAuth ? 'Manage your account and private reports.' : 'Manage your local preview session.')}</p></div>
    <div className="flow-content">
    {loading && <p role="status">{t('Loading project…')}</p>}
    {error && <p role="alert">{t('Request failed')}</p>}
    {notice && <p role="status">{t(notice)}</p>}
    {!loading && !session && !error && <Link className="button" href={history ? '/auth/sign-in?next=%2Faccount%2Freports' : '/auth/sign-in'}>{t(realAuth ? 'Sign In' : 'Sign in locally')}</Link>}
    {session && !history && <section className="flow-form">
      <p>{t(session.email ? 'Email' : 'Fixture account')}: <strong>{session.account}</strong></p>
      {session.email && <p>{t(session.verified ? 'Email verified' : 'Verification required')}</p>}
      <div className="button-row"><Link className="button" href="/account/reports">{t('My reports')}</Link>
        <button className="secondary" onClick={async () => {
          try {
            if (session.email) {
              if (!(await requestAuth({ action: 'sign-out' }))) throw new Error('Sign out failed');
            } else await api('session', 'DELETE');
            router.replace('/auth/sign-in'); router.refresh();
          }
          catch { setError(true); }
        }}>{t('Sign out')}</button>
      </div>
    </section>}
    </div>
    {session && history && !loading && <section aria-label={t('My reports')}>
      {ids.length === 0 && <><p>{t('No projects yet.')}</p><Link className="button" href="/validate">{t('Validate My Idea')}</Link></>}
      {projects.map(project => <article className="history-row" key={project.id}>
        <h2>{project.profiles[0]?.content.summary || t('Open project')}</h2>
        <p>{t('Validate My Idea')} · {project.profiles[0]?.content.geography.state ?? t('Australia')} · {t(project.runs.at(-1)?.status ?? 'No run has started.')}</p>
        <ul>{project.reports.map((report, index) => <li key={report.id}><Link href={reportPath(project.id, report.id)}>{t('View report')} {index + 1}</Link> · <time dateTime={report.createdAt}>{new Intl.DateTimeFormat(locale === 'en' ? 'en-AU' : 'zh-CN', { dateStyle: 'medium' }).format(new Date(report.createdAt))}</time></li>)}</ul>
        <div className="button-row"><Link className="button secondary" href={`/validate/${project.id}/review`}>{t('Open project')}</Link>
          <button className="secondary danger" onClick={async () => {
            if (!window.confirm(t('Delete this project and all its reports?'))) return;
            try {
              await api(`projects/${project.id}`, 'DELETE');
              setNotice('Project input, versions, runs and reports deleted from the local database.');
              setProjects(entries => entries.filter(entry => entry.id !== project.id));
              setIds(keys => keys.filter(id => id !== project.id));
              if (projects.length === 1 && page > 0) setPage(page - 1);
            } catch { setError(true); }
          }}>{t('Delete project and reports')}</button>
        </div>
      </article>)}
      {ids.length > pageSize && <div className="button-row">
        <button className="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('Previous page')}</button>
        <button className="secondary" disabled={(page + 1) * pageSize >= ids.length} onClick={() => setPage(page + 1)}>{t('Next page')}</button>
      </div>}
    </section>}
  </div>;
}
