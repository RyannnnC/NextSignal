import { AimOutlined, ArrowDownOutlined, ArrowRightOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { Profile, Report } from '@nextsignal/contracts';
import { translate, type Locale } from '../../lib/i18n';
import { EvidencePreview } from './evidence-preview';
import styles from './report-detail.module.css';

/** Preview only evidence saved with the selected report version. */
export function ReportSummary({ report, profile, locale }: {
  report: Report;
  profile: Profile | null;
  locale: Locale;
}) {
  const t = (text: string) => translate(locale, text);
  const recommendation = report.actions.reduce((first, action) => action.priority < first.priority ? action : first);
  const finding = report.findings.find(item => item.id === recommendation.findingId);
  const hypothesis = report.findings.find(item => item.status === 'hypothesis');
  const observed = report.evidence.find(item => item.provider === 'abs' && item.classification === 'VERIFIED_SOURCE')
    ?? report.evidence.find(item => item.classification === 'VERIFIED_SOURCE' && item.metric === 'market_context');
  const simulated = report.evidence.find(item => item.synthetic && item.value !== null && !item.classification);
  const illustrative = report.evidence.find(item => item.classification === 'HYPOTHESIS' && item.metric === 'keyword_hypothesis');
  const sourceName = observed?.abs ? t('ABS 2021 Census') : t(observed?.citation?.name ?? '');
  const reason = finding && finding.status !== 'hypothesis' ? finding.text : recommendation.rationale;
  const numbers = new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN');
  return <>
    <section className={styles.recommendation} aria-labelledby="decision-summary">
      <h2 id="decision-summary" tabIndex={-1}><AimOutlined aria-hidden="true" />{t(report.referenceProfile ? 'Recommended next step' : 'Suggested experiment template')}</h2>
      <p className={styles.recommendationTitle}>{t(recommendation.title)}</p>
      <p className={styles.recommendationWhy}>{t(reason)}</p>
      <div className={styles.actions}>
        <a className="button" href={`#action-${recommendation.id}`}>{t('First experiment')} <ArrowDownOutlined aria-hidden="true" /></a>
        <a className="button secondary" href="#evidence-preview">{t('View evidence')} <FolderOpenOutlined aria-hidden="true" /></a>
      </div>
    </section>
    <section className={styles.evidence} aria-labelledby="evidence-preview">
      <div className={styles.evidenceHeading}>
        <h2 id="evidence-preview" tabIndex={-1}>{t('Evidence at a glance')}</h2>
        <a href="#report-evidence">{t('All sources')} <ArrowRightOutlined aria-hidden="true" /></a>
      </div>
      <div className={styles.evidenceRows}>
        {observed ? <EvidencePreview kind="statistic" label={t(typeof observed.value === 'number' ? 'Published statistic' : 'Published context')} summary={
          typeof observed.value === 'number' ? <>
            <span className={styles.number}>{numbers.format(observed.value)}</span> {t(observed.unit ?? '')} · {observed.localArea?.location.name ?? observed.scope} · {sourceName}
          </> : <>{t(observed.scope ?? '')} · {sourceName}</>
        }>
          <p>{observed.limitations.map(t).join(' ')}</p>
          {observed.citation && <p><a href={observed.citation.url} rel="noreferrer">{observed.citation.name}</a> · {t('Source checked')} {observed.citation.checkedOn}</p>}
          <a href={`#evidence-${observed.id}`}>{t('View source details')}</a>
        </EvidencePreview> : <EvidencePreview kind="unknown" label={t('Published statistics unavailable')} summary={t('This report has no published statistic to display.')}>
          <a href="#report-evidence">{t('View coverage and sources')}</a>
        </EvidencePreview>}
        {profile && <EvidencePreview kind="statement" label={t('Founder statement')} summary={
          profile.customer === report.referenceProfile?.customer ? t(profile.customer) : profile.customer
        }>
          <a href="#overview">{t('View saved business profile')}</a>
        </EvidencePreview>}
        {simulated && <EvidencePreview kind="simulation" label={t('Simulated result')} summary={t('This example uses simulated research data.')}>
          <p>{simulated.limitations.map(t).join(' ')}</p>
          <a href={`#evidence-${simulated.id}`}>{t('View source details')}</a>
        </EvidencePreview>}
        {!simulated && illustrative && <EvidencePreview kind="simulation" label={t('Illustrative search terms')} summary={t('Search volume remains unknown.')}>
          <p>{t(String(illustrative.value))}</p>
          <a href={`#evidence-${illustrative.id}`}>{t('View source details')}</a>
        </EvidencePreview>}
        {hypothesis && <EvidencePreview kind="hypothesis" label={t('Hypothesis to test')} summary={t(hypothesis.text)}>
          <p>{t(hypothesis.validationMethod)}</p>
          <a href={`#finding-${hypothesis.id}`}>{t('View finding details')}</a>
        </EvidencePreview>}
        {!hypothesis && finding && <EvidencePreview kind="unknown" label={t('Evidence gap')} summary={t(finding.text)}>
          <p>{t(finding.validationMethod)}</p>
          <a href={`#finding-${finding.id}`}>{t('View finding details')}</a>
        </EvidencePreview>}
      </div>
    </section>
  </>;
}
