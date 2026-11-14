'use client';

import Image from 'next/image';
import Link from 'next/link';
import bigLogo from '../../../../assets/BigLogo.png';
import { services } from '../../lib/services';
import { useLanguage } from './site-shell';
import styles from './marketing-home.module.css';

const steps = [
  ['Describe your idea', 'Tell us what you want to offer and who it might help.'],
  ['Check the details', 'Review the customer and problem before starting the report.'],
  ['Choose what to test', 'See what you can check next and where more information is needed.'],
] as const;

const features: Record<string, readonly string[]> = {
  free: ['Review your business idea', 'See what the example can and cannot tell you', 'Get three practical next steps'],
  'idea-report': ['Check local demand', 'See what people search for', 'Compare other businesses and plan what to test'],
  'growth-report': ['Review your website', 'Find topics your customers look for', 'Choose the changes to make first'],
  expert: ['Discuss your report with a specialist', 'Improve how customers find your website', 'Get help improving key pages'],
};

/** 展示首页的产品入口、示例和计划报价。 */
export function MarketingHome() {
  const {t,locale} = useLanguage();
  return <>
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <Image className={styles.logo} src={bigLogo} alt="NextSignal" priority sizes="(max-width: 639px) 240px, 300px"/>
          <h1>{t('Find your next business opportunity.')}</h1>
          <p className={styles.heroTagline}><strong>{t('Backed by real data.')}</strong></p>
          <p className={styles.lead}>{t('Explore local demand, competition, and market opportunities across Australia — before you invest.')}</p>
          <Link className="button bright" href="/validate">{t('Explore opportunities')} <span aria-hidden="true">↗</span></Link>
          <p className={styles.heroNotice}>{t('Use a test idea in this preview.')}</p>
        </div>
        <aside className={styles.heroExample} aria-labelledby="hero-example">
          <p className="eyebrow">{t('Example report')}</p>
          <h2 id="hero-example">{t('Laptop repairs for students in Sydney')}</h2>
          <p>{t('Who needs help? Where do they go now? What would make them book a repair?')}</p>
          <a href="#research">{t('See what the example covers')} <span aria-hidden="true">↓</span></a>
        </aside>
      </div>
    </div>

    <section className={styles.band + ' ' + styles.muted} aria-labelledby="products-heading">
      <div className={styles.inner}>
        <h2 id="products-heading">{t('Where are you starting?')}</h2>
        <div className={styles.products}>
          <div>
            <h3>{t('Validate My Idea')}</h3>
            <p>{t('Tell us your idea and see what to check before you launch.')}</p>
            <Link href="/validate">{t('Try the free demo')} <span aria-hidden="true">↗</span></Link>
          </div>
          <div>
            <h3>{t('Grow My Business')}</h3>
            <p>{t('Already have a business? Website reviews are planned.')}</p>
            <Link href="/grow">{t('See what’s planned')} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.band} aria-labelledby="how-it-works">
      <div className={styles.inner}>
        <h2 id="how-it-works">{t('How It Works')}</h2>
        <ol className={styles.steps}>{steps.map(([title, description]) => <li key={title}><h3>{t(title)}</h3><p>{t(description)}</p></li>)}</ol>
      </div>
    </section>

    <section id="research" className={styles.band + ' ' + styles.mint} aria-labelledby="research-heading">
      <div className={styles.inner + ' ' + styles.research}>
        <div>
          <h2 id="research-heading">{t('See an example report')}</h2>
          <p>{t('The Sydney laptop repair example shows who the service could help, where customers might go today, and which questions are still open.')}</p>
        </div>
        <div>
          <p>{t('Try it by choosing “Load Sydney repair example” in the demo.')}</p>
          <Link href="/validate">{t('Open the demo')} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>

    <section id="pricing" className={styles.band} aria-labelledby="pricing-heading">
      <div className={styles.inner}>
        <h2 id="pricing-heading">{t('Pricing & Services')}</h2>
        <p>{t('The demo is free. Paid services are planned and prices may change.')}</p>
        <div className={styles.pricing}>{services.map(service => <article className={styles.service} key={service.id} aria-labelledby={`service-${service.id}`}>
          <p className={styles.availability}>{t(service.status === 'planned' ? 'Planned — not available' : 'Free demo')}</p>
          <h3 id={`service-${service.id}`}>{t(service.name)}</h3>
          <p className={styles.price}>{service.amount === null ? t('Custom Quote') : <>A${new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN').format(service.amount)}{service.perReport && <small> {t('/ report')}</small>}</>}</p>
          <ul>{(features[service.id] ?? service.features).map(feature => <li key={feature}>{t(feature)}</li>)}</ul>
          <Link href={service.href}>{t(service.id === 'free' ? 'Try the free demo' : service.id === 'expert' ? 'View service status' : 'See what’s planned')}</Link>
        </article>)}</div>
        <details id="idea-scope"><summary>{t('What the idea report would cover')}</summary><p>{t('We plan to add search data and business comparisons. You can try the sample report today.')}</p></details>
        <details id="expert-status"><summary>{t('Expert service status')}</summary><p>{t('Expert help is planned. Bookings are closed.')}</p></details>
      </div>
    </section>
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
