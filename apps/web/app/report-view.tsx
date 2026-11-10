import type { Report } from '@kyb/contracts';
import { translate, type Locale } from '../lib/i18n';

/** 渲染已验证的报告快照、证据来源和局限。 */
export function ReportView({ report, index, locale }: { report: Report; index: number; locale: Locale }) {
  /** 按当前报告语言翻译界面标签。 */
  const t=(text:string)=>translate(locale,text);
  return <article className="report" aria-label={`${t('Fixture report')} ${index+1}`}>
    <div className="report-header"><span className="eyebrow">{t('Fixture report')} / {String(index+1).padStart(2,'0')}</span><span className="chip warning">{t('Synthetic fixture')}</span></div>
    <h2>{t(report.title)}</h2>
    <p className="metadata">{t('Not human reviewed')} · <time dateTime={report.createdAt}>{new Intl.DateTimeFormat(locale==='en'?'en-AU':'zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(report.createdAt))}</time></p>
    <p>{t('Target market')}: {t(report.geography.country)} · {t(report.geography.granularity)}</p>
    <ul className="limitations">{report.limitations.map(text=><li key={text}>{t(text)}</li>)}</ul>
    {report.findings.map(f=><div className="reality-check" key={f.id}><span className="eyebrow">{t('Reality Check')}</span><h3>{t(f.text)}</h3><p><span className="chip warning">{t(f.status)}</span> <small>{t(f.claimType)}</small></p><p>{t('Test')}: {t(f.validationMethod)}</p>
      <details><summary>{t('Supporting evidence')} / {t('Counter-evidence')}</summary><p className="technical">{t('Supporting evidence')}: {f.evidenceIds.join(', ')||t('None')}. {t('Counter-evidence')}: {f.counterEvidenceIds.join(', ')||t('None')}.</p></details>
    </div>)}
    <h3>{t('Evidence')}</h3>{report.evidence.length===0&&<p className="empty">{t('Not enough data. No provider evidence returned.')}</p>}
    {report.evidence.map(e=><details className="evidence" key={e.id}><summary>{t(e.metric)}: {e.value===null?t('Not enough data'):`${typeof e.value==='string'?t(e.value):e.value} (${t('Synthetic fixture')})`}</summary><dl>
      <div><dt>{t('Source')}</dt><dd className="technical">{e.sourceRef}</dd></div><div><dt>{t('Region')}</dt><dd>{t(e.geography.country)}, {t(e.geography.granularity)}</dd></div>
      <div><dt>{t('Retrieved')}</dt><dd>{e.retrievedAt}</dd></div><div><dt>{t('Reference period')}</dt><dd>{e.observedPeriod?`${e.observedPeriod.from} – ${e.observedPeriod.to}`:t('Unavailable')}</dd></div>
      <div><dt>{t('Method')}</dt><dd>{t(e.kind)} · {t('confidence')}: {t(e.confidence)} · {t('stale')}: {t(String(e.stale))}</dd></div>
      <div><dt>{t('Evidence ID')}</dt><dd className="technical">{e.id}</dd></div></dl><ul>{e.limitations.map(l=><li key={l}>{t(l)}</li>)}</ul></details>)}
    <h3>{t('Template experiments — not personalised advice')}</h3><ol className="actions">{report.actions.map(a=><li key={a.id}><h4>{t(a.title)}</h4><p>{t(a.steps)}</p><p className="metadata">{t('Reason')}: {t(a.rationale)} {t('Effort')}: {t(a.effort)}.</p><p><strong>{t('What would disprove it')}:</strong> {t(a.falsification)}</p></li>)}</ol>
    <details><summary>{t('Profile version ID')}</summary><p className="technical">{report.profileId}</p></details>
    <p className="metadata">{t('For a correction, edit and confirm the profile, then start a new fixture run.')}</p>
  </article>;
}
