import type { Report } from '@nextsignal/contracts';
import { translate, type Locale } from '../lib/i18n';

/** 渲染已验证的报告快照、证据来源和局限。 */
export function ReportView({ report, index, locale }: { report: Report; index: number; locale: Locale }) {
  /** 按当前报告语言翻译界面标签。 */
  const t=(text:string)=>translate(locale,text);
  const comparison = report.localOpportunity;
  const hasAbs = report.evidence.some(item => item.provider === 'abs');
  const numbers = new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN');
  return <article className="report" aria-label={`${t('Fixture report')} ${index+1}`}>
    <div className="report-header"><span className="eyebrow">{t('Fixture report')} / {String(index+1).padStart(2,'0')}</span><span className="chip warning">{t(hasAbs ? 'Development report with ABS data' : 'Synthetic fixture')}</span></div>
    <h2>{t(report.title)}</h2>
    {report.referenceProfile && !comparison && <p>{t('Sydney computer repair reference report')}</p>}
    <p className="metadata">{t('Not human reviewed')} · <time dateTime={report.createdAt}>{new Intl.DateTimeFormat(locale==='en'?'en-AU':'zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(report.createdAt))}</time></p>
    <p>{t('Target market')}: {report.referenceProfile ? 'Sydney, NSW, AU' : `${t(report.geography.country)} · ${t(report.geography.granularity)}`}</p>
    <ul className="limitations">{report.limitations.map(text=><li key={text}>{t(text)}</li>)}</ul>
    {comparison && <>
      <h3>{t('Business constraints')}</h3>
      <p>{t('Business category')}: {t('Computer repair')} · {t('Startup budget (AUD, optional)')}: {comparison.input.budgetAud === undefined ? t('Not supplied') : `A$${numbers.format(comparison.input.budgetAud)}`}</p>
      <p>{t('Setup costs and repair economics still need quotes.')}</p>
      <h3>{t('Compared locations')}</h3>
      {comparison.areas.map(area => {
        const items = report.evidence.filter(item => area.evidenceIds.includes(item.id));
        const population = items.find(item => item.metric === 'market_context' && item.unit === 'people');
        const demand = items.find(item => item.metric === 'search_volume');
        const competitor = items.find(item => item.metric === 'competitor_observation');
        return <div className="evidence" key={area.id}>
          <h4>{area.location.name}</h4>
          <p className="metadata">{t('ABS statistical locality')} · {area.location.mapping.status === 'verified' ? `${area.location.mapping.sourceId} · ${area.location.mapping.datasetVersion}` : area.location.mapping.limitation}</p>
          <dl>
            <div><dt>{t('Census population')}</dt><dd>{typeof population?.value === 'number' ? `${numbers.format(population.value)} ${t('people')} · ${t('2021 Census')}` : 'NOT_AVAILABLE'}</dd></div>
            {population?.citation && <div><dt>{t('Source')}</dt><dd><a href={population.citation.url} rel="noreferrer">{population.citation.name}</a></dd></div>}
            <div><dt>{t('Demand evidence')}</dt><dd>{demand?.value ?? 'NOT_AVAILABLE'}</dd></div>
            <div><dt>{t('Local competitors')}</dt><dd>{competitor?.value ?? 'NOT_AVAILABLE'}</dd></div>
          </dl>
        </div>;
      })}
      <h3>{t('Opportunities and risks')}</h3>
      <p>{t('The population figures provide context. Repair demand, local alternatives and setup costs must be checked before choosing an area.')}</p>
    </>}
    {report.findings.map(f=><div className="reality-check" key={f.id}><span className="eyebrow">{t('Reality Check')}</span><h3>{t(f.text)}</h3><p><span className="chip warning">{t(f.status)}</span> <small>{t(f.claimType === 'research_hypothesis' ? 'Research hypothesis' : f.claimType)}</small></p><p>{t('Test')}: {t(f.validationMethod)}</p>
      <details><summary>{t('Supporting evidence')} / {t('Counter-evidence')}</summary><p className="technical">{t('Supporting evidence')}: {f.evidenceIds.join(', ')||t('None')}. {t('Counter-evidence')}: {f.counterEvidenceIds.join(', ')||t('None')}.</p></details>
    </div>)}
    <h3>{t('Evidence')}</h3>{report.evidence.length===0&&<p className="empty">{t('Not enough data. No provider evidence returned.')}</p>}
    {report.evidence.map(e=><details className="evidence" key={e.id}><summary>{t(e.metric)}: {e.classification ?? (e.value===null?t('Not enough data'):`${typeof e.value==='string'?t(e.value):e.value} (${t('Synthetic fixture')})`)}</summary>
      {e.classification && <p>{e.value === null ? t('Not enough data') : typeof e.value === 'string' ? t(e.value) : numbers.format(e.value)}</p>}
      <dl><div><dt>{t('Source')}</dt><dd className="technical">{e.citation ? <a href={e.citation.url} rel="noreferrer">{e.citation.name}</a> : e.sourceRef}</dd></div><div><dt>{t('Region')}</dt><dd>{e.scope ?? `${t(e.geography.country)}, ${t(e.geography.granularity)}`}</dd></div>
      <div><dt>{t(e.citation ? 'Source checked' : e.classification ? 'Recorded' : 'Retrieved')}</dt><dd>{e.citation?.checkedOn ?? e.retrievedAt}</dd></div><div><dt>{t('Reference period')}</dt><dd>{e.observedPeriod?`${e.observedPeriod.from} – ${e.observedPeriod.to}`:t('Unavailable')}</dd></div>
      {e.unit && <div><dt>{t('Unit')}</dt><dd>{t(e.unit)}</dd></div>}
      {e.abs && <div><dt>{t('ABS dataflow')}</dt><dd className="technical">{e.abs.dataflowId} {e.abs.dataflowVersion} · DSD {e.abs.structureVersion} · SAL {e.abs.region}{e.abs.observationStatus && ` · ${e.abs.observationStatus}`}</dd></div>}
      {e.attribution && <div><dt>{t('Attribution')}</dt><dd><a href={e.attribution.url} rel="noreferrer">{e.attribution.license}</a></dd></div>}
      <div><dt>{t('Method')}</dt><dd>{t(e.kind)} · {t('confidence')}: {t(e.confidence)} · {t('stale')}: {t(String(e.stale))}</dd></div>
      <div><dt>{t('Evidence ID')}</dt><dd className="technical">{e.id}</dd></div></dl><ul>{e.limitations.map(l=><li key={l}>{t(l)}</li>)}</ul></details>)}
    <h3>{t(report.referenceProfile ? 'Prioritised validation actions' : 'Template experiments — not personalised advice')}</h3><ol className="actions">{report.actions.map(a=><li key={a.id}><h4>{t(a.title)}</h4><p>{t(a.steps)}</p><p className="metadata">{t('Reason')}: {t(a.rationale)} {t('Effort')}: {t(a.effort)}.</p><p><strong>{t('What would disprove it')}:</strong> {t(a.falsification)}</p></li>)}</ol>
    <details><summary>{t('Profile version ID')}</summary><p className="technical">{report.profileId}</p></details>
    <p className="metadata">{t('For a correction, edit and confirm the profile, then start a new fixture run.')}</p>
  </article>;
}
