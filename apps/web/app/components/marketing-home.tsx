'use client';

import { ArrowRightOutlined, BulbOutlined, FileTextOutlined, RiseOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { homeHeadline } from '../../lib/i18n';
import { publicExample } from '../../lib/public-example';
import { services } from '../../lib/services';
import { EvidencePreview } from './evidence-preview';
import { useLanguage } from './site-shell';
import styles from './marketing-home.module.css';

const steps = [
  ['Describe your idea', 'Say what you want to offer and who it could help.'],
  ['Review your profile', 'Confirm the customer, problem and market before generating a report.'],
  ['Choose what to test', 'Use the report to pick a practical validation experiment.'],
] as const;

const paths = [
  { icon: BulbOutlined, name: 'Validate My Idea', status: 'Preview available', description: 'Find the assumptions to test before you launch.', action: 'Start a preview', href: '/validate' },
  { icon: RiseOutlined, name: 'Grow My Business', status: 'Planned', description: 'Explore what future website and growth research would cover.', action: 'See what’s planned', href: '/grow' },
] as const;

/** 展示首页的产品入口、公开示例和服务状态。 */
export function MarketingHome() {
  const { t, locale } = useLanguage();
  const numbers = new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN');
  return <>
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <h1>{t(homeHeadline[0])} <span>{t(homeHeadline[1])}</span></h1>
          <p className={styles.lead}>{t('Practical research for Australian founders and small businesses. See what the evidence supports and what to check next.')}</p>
          <div className={styles.actions}>
            <Link className="button bright" href="/validate">{t('Validate my idea')} <ArrowRightOutlined aria-hidden="true" /></Link>
            <Link className="button secondary" href="/example-report">{t('See example report')} <FileTextOutlined aria-hidden="true" /></Link>
          </div>
          <p className={styles.heroNotice}>{t('Free local preview · Research is simulated')}</p>
        </div>
        <aside id="research" className={styles.preview} aria-labelledby="hero-example">
          <div className={styles.previewHeader}>
            <strong><FileTextOutlined aria-hidden="true" /> {t('Example report')}</strong>
          </div>
          <div className={styles.previewBody}>
            <h2 id="hero-example">{t(publicExample.title)}</h2>
            <EvidencePreview kind="statistic" label={t('Published statistic')} summary={<>
              <span className={styles.number}>{numbers.format(publicExample.population)}</span> {t('residents · Haymarket, NSW · ABS 2021 Census')}
            </>} />
            <EvidencePreview kind="hypothesis" label={t('Hypothesis to test')} summary={t(publicExample.hypothesis)} />
            <EvidencePreview kind="action" label={t('Suggested first test')} summary={t(publicExample.firstTest)} />
            <Link className={styles.textLink} href="/example-report">{t('Open full example')} <ArrowRightOutlined aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
    </div>

    <section className={styles.paths} aria-labelledby="products-heading">
      <div className={styles.inner}>
        <h2 id="products-heading">{t('Where are you starting?')}</h2>
        <div className={styles.products}>
          {paths.map(({ icon: Icon, name, status, description, action, href }) => <article key={href} className={styles.pathCard}>
            <span className={styles.pathIcon}><Icon aria-hidden="true" /></span>
            <div>
              <div className={styles.pathHeading}><h3>{t(name)}</h3><span className={status === 'Planned' ? styles.planned : styles.available}>{t(status)}</span></div>
              <p>{t(description)}</p>
              <Link className={styles.textLink} href={href}>{t(action)} <ArrowRightOutlined aria-hidden="true" /></Link>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <section className={styles.stepsBand} aria-labelledby="how-it-works">
      <div className={styles.inner}>
        <h2 id="how-it-works">{t('From idea to first test')}</h2>
        <ol className={styles.steps}>{steps.map(([title, description], index) => <li key={title}>
          <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <h3>{t(title)}</h3><p>{t(description)}</p>
        </li>)}</ol>
      </div>
    </section>

    <section id="pricing" className={styles.pricingBand} aria-labelledby="pricing-heading">
      <div className={styles.inner}>
        <div className={styles.pricingIntro}>
          <h2 id="pricing-heading">{t('Pricing & Services')}</h2>
          <p>{t('The local preview is free. Prices shown are proposals for planned services.')}</p>
        </div>
        <div id="service-plans" className={styles.pricing}>
          {services.map(service => <article className={`${styles.service} ${service.status === 'fixture' ? styles.featuredService : ''}`} key={service.id} aria-labelledby={`service-${service.id}`}>
            <h3 id={`service-${service.id}`}>{t(service.name)}</h3>
            <p className={styles.serviceStatus}>{t(service.status === 'planned' ? 'Planned — not available' : 'Free preview')}</p>
            <p className={styles.price}>
              {service.amount === null ? <strong className={styles.quote}>{t('Quote planned')}</strong> :
                <><strong>A${numbers.format(service.amount)}</strong>{service.perReport && <small>{t('/ report')}</small>}</>}
            </p>
            <ul>{service.features.map(feature => <li key={feature}>{t(feature)}</li>)}</ul>
            <Link className={service.status === 'fixture' ? `button ${styles.serviceAction}` : `${styles.textLink} ${styles.serviceAction}`} href={service.href}>
              {t(service.id === 'free' ? 'Try the free preview' : service.id === 'expert' ? 'View service status' : 'See what’s planned')}
              <ArrowRightOutlined aria-hidden="true" />
            </Link>
          </article>)}
        </div>
        <div className={styles.serviceNotes}>
          <div id="idea-scope">
            <h3>{t('What the idea report would cover')}</h3>
            <p>{t('We plan to add search data and business comparisons. You can try the sample report today.')}</p>
          </div>
          <div id="expert-status">
            <h3>{t('Expert service status')}</h3>
            <p>{t('Expert help is planned. Bookings are closed.')}</p>
          </div>
        </div>
      </div>
    </section>
  </>;
}


/** 介绍后续增长研究范围，当前页面不收集网站地址。 */
export function GrowthScope() {
  const {t} = useLanguage();
  return <div className="workspace"><p className="eyebrow">{t('Planned — not available')}</p><h1>{t('Grow My Business')}</h1><p>{t('Website research will be available in a later milestone.')}</p>
    <section><h2>{t('Planned growth research')}</h2><ul>{services.find(service=>service.id==='growth-report')!.features.map(feature=><li key={feature}>{t(feature)}</li>)}</ul><p>{t('There is no website crawler, SEO/GEO analysis or live growth report in this version. No URL is collected or fetched.')}</p></section>
    <Link className="button" href="/validate">{t('Try the free preview')}</Link><p><Link href="/#pricing">{t('Pricing & Services')}</Link></p>
  </div>;
}
