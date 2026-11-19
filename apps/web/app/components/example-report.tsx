'use client';

import Link from 'next/link';
import { useLanguage } from './site-shell';

const censusUrl = 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL11884';

/** 展示人工编写的演示案例与可公开引用的人口数据。 */
export function ExampleReport() {
  const { t, locale } = useLanguage();
  const population = new Intl.NumberFormat(locale === 'en' ? 'en-AU' : 'zh-CN').format(8305);
  return <div className="flow-layout">
    <div><p className="eyebrow">{t('Example report')}</p><h1>{t('Laptop repairs for students in Sydney')}</h1>
      <p>{t('Read-only example based on an invented business idea and public census data.')}</p>
      <Link className="button" href="/validate">{t('Try the free preview')}</Link>
    </div>
    <div className="flow-content">
      <section><h2>{t('Example founder statement')}</h2><p>{t('“I want to offer laptop repairs near campus for students who cannot wait a week.”')}</p></section>
      <section><h2>{t('Published statistic')}</h2>
        <p><strong>{population}</strong> {t('people in Haymarket, NSW (SAL11884), 2021 Census.')}</p>
        <p>{t('This count describes residents. Repair demand, student status and willingness to pay still need evidence.')}</p>
        <a href={censusUrl}>{t('Australian Bureau of Statistics, 2021 Census QuickStats')}</a> · <a href="https://www.abs.gov.au/website-privacy-copyright-and-disclaimer">CC BY 4.0</a>
      </section>
      <section><h2>{t('Simulated report output')}</h2><p>{t('Suggested search terms include “laptop repair near campus” and “same-day laptop repair Sydney”. Search volumes and competitor prices are unknown.')}</p></section>
      <section><h2>{t('Hypothesis to test')}</h2><p>{t('Students may book a repair if the diagnostic fee and pickup time are clear. Ask students about their last repair and test an opt-in booking offer before renting a space.')}</p></section>
    </div>
  </div>;
}
