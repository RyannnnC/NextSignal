'use client';

import Image from 'next/image';
import Link from 'next/link';
import bigLogo from '../../../../assets/BigLogo.png';
import { services } from '../../lib/services';
import { useLanguage } from './site-shell';
import styles from './marketing-home.module.css';

/** 展示产品入口和当前可用范围。 */
export function MarketingHome() {
  const {t,locale} = useLanguage();
  return <>
    <div className={`hero ${styles.hero}`}>
      <div><Image className={styles.logo} src={bigLogo} alt="NextSignal" priority sizes="(max-width: 639px) 80vw, 480px"/>
        <h1>{t('Know your market.')}<br/><span>{t('Find your next signal.')}</span></h1>
        <p className="lead">{t('Validate ideas and uncover growth opportunities with evidence grounded in Australian market data.')}</p>
        <Link className="button bright" href="/validate">{t('Start Free')} <span aria-hidden="true">↗</span></Link>
        <p className={styles.heroNotice}>{t('Available today: a local idea fixture, not real AI or market research.')}</p>
      </div>
    </div>
    <div className="journey-grid">
      <Link className="journey-card" href="/validate"><span className="chip">{t('Available in M1')}</span><strong>{t('Validate My Idea')}</strong><span>{t('Start with a question, then confirm your assumptions.')}</span><span aria-hidden="true">↗</span></Link>
      <Link className="journey-card deferred" href="/grow"><span className="chip neutral">{t('Coming later')}</span><strong>{t('Grow My Business')}</strong><span>{t('Website research will be available in a later milestone.')}</span><span>{t('View planned scope')} ↗</span></Link>
    </div>
    <section className={styles.section} aria-labelledby="how-it-works"><h2 id="how-it-works">{t('How It Works')}</h2>
      <p>{t('Evidence before confidence.')}</p>
      <ol className={styles.steps}>{['Describe','Confirm','Explore'].map((step,index)=><li key={step}><span className="step-number">0{index+1}</span><h3>{t(step)}</h3><p>{t(['Describe a test business idea.','Correct and confirm your business assumptions.','Explore a private fixture report and its limitations.'][index]!)}</p></li>)}</ol>
      <p>{t('Local fixture — no real market research, AI inference, payments or website crawling.')}</p>
    </section>
    <section id="pricing" className={styles.section} aria-labelledby="pricing-heading"><h2 id="pricing-heading">{t('Pricing & Services')}</h2>
      <p>{t('Prices are proposals, not offers to purchase. Paid reports and expert services are not available.')}</p>
      <div className={styles.pricing}>{services.map(service=><article className={styles.serviceCard} key={service.id} aria-labelledby={`service-${service.id}`}>
        <span className={`chip ${service.status === 'planned' ? 'neutral' : ''}`}>{t(service.status === 'planned' ? 'Planned — not available' : 'Local fixture only')}</span>
        <h3 id={`service-${service.id}`}>{t(service.name)}</h3>
        <p className={styles.price}>{service.amount === null ? t('Custom Quote') : <>A${new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN').format(service.amount)}{service.perReport && <small> {t('/ report')}</small>}</>}</p>
        {service.perReport && <p className="metadata">{t('Placeholder price')}</p>}
        <ul>{service.features.map(feature=><li key={feature}>{t(feature)}</li>)}</ul>
        <Link className="button" href={service.href}>{t(service.cta)}</Link>
      </article>)}</div>
      <details id="idea-scope"><summary>{t('Planned idea report scope')}</summary><p>{t('Market demand, keyword evidence, competitors and Red Team research require future licensed integrations. They are not delivered by the current fixture.')}</p></details>
      <details id="expert-status"><summary>{t('Expert service status')}</summary><p>{t('No consultation booking or human review service is offered yet. Custom Quote describes a future service; no payment or contact data is collected here.')}</p></details>
    </section>
    <section className={styles.cta} aria-labelledby="free-heading"><h2 id="free-heading">{t('Try Free Analysis')}</h2><p>{t('Free Business Snapshot is a limited local fixture, not a subscription trial. Website analysis is not yet available.')}</p><Link className="button" href="/validate">{t('Start Free Analysis')}</Link></section>
    <section id="research" className={styles.section} aria-labelledby="research-heading"><h2 id="research-heading">{t('Research & Case Studies')}</h2><p>{t('Planned editorial space. No verified case studies have been published.')}</p>
      <div className={styles.research}>{['Australian market research articles','Idea validation examples','Website growth case studies'].map(title=><article className={styles.serviceCard} key={title}><span className="chip neutral">{t('Planned content')}</span><h3>{t(title)}</h3><p>{t('Publication requires human review, source provenance and editorial approval. Private user reports will not appear here.')}</p></article>)}</div>
    </section>
    <section className={styles.cta} aria-labelledby="final-heading"><h2 id="final-heading">{t('Find your next signal.')}</h2><p>{t('Start with a test idea. Keep the evidence, assumptions and unknowns separate.')}</p><Link className="button" href="/validate">{t('Start Free')}</Link></section>
  </>;
}

/** 介绍后续增长研究范围，当前页面不收集网站地址。 */
export function GrowthScope() {
  const {t} = useLanguage();
  return <div className="workspace"><p className="eyebrow">{t('Planned — not available')}</p><h1>{t('Grow My Business')}</h1><p>{t('Website research will be available in a later milestone.')}</p>
    <section><h2>{t('Planned growth research')}</h2><ul>{services.find(service=>service.id==='growth-report')!.features.map(feature=><li key={feature}>{t(feature)}</li>)}</ul><p>{t('There is no website crawler, SEO/GEO analysis or live growth report in this version. No URL is collected or fetched.')}</p></section>
    <Link className="button" href="/validate">{t('Try the local idea fixture')}</Link><p><Link href="/#pricing">{t('Pricing & Services')}</Link></p>
  </div>;
}
