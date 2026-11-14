import type { Report } from '@nextsignal/contracts';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

/** 绘制同一地理口径和年份的人口数据，缺失值保留为文本。 */
export function PopulationChart({ report, numbers, t }: { report: Report; numbers: Intl.NumberFormat; t: (text: string) => string }) {
  const rows = report.localOpportunity?.areas.map(area => {
    const evidence = report.evidence.find(item => area.evidenceIds.includes(item.id) && item.metric === 'market_context' &&
      item.unit === 'people' && item.observedPeriod?.from === '2021-08-10T00:00:00.000Z' &&
      (item.classification === 'VERIFIED_SOURCE' || item.classification === 'RECORDED_SAMPLE') &&
      typeof item.value === 'number' && item.value >= 0 && item.citation);
    return { area, evidence };
  }) ?? [];
  const data = rows.flatMap(({ area, evidence }) => typeof evidence?.value === 'number'
    ? [{ area: area.location.name, population: evidence.value }] : []);
  return <figure className="population-chart">
    <figcaption><strong>{t('Census population by locality')}</strong> · {t('2021 Census')}</figcaption>
    <p className="metadata">{t('Historical resident population for each ABS statistical locality.')}</p>
    {data.length > 0 && <div aria-hidden="true">
      <ResponsiveContainer width="100%" height={data.length * 44 + 36}>
        <BarChart data={data} layout="vertical" accessibilityLayer={false} margin={{ top: 4, right: 22, bottom: 4, left: 0 }}>
          <XAxis type="number" tickCount={4} allowDecimals={false} tickFormatter={value => numbers.format(value)} tick={{ fill: 'var(--ns-text)', fontSize: 12 }} />
          <YAxis type="category" dataKey="area" width={102} tickLine={false} tick={{ fill: 'var(--ns-text)', fontSize: 12 }} />
          <Bar dataKey="population" fill="var(--ns-primary)" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
    <ul>
      {rows.map(({ area, evidence }) => <li key={area.id}>
        <span>{area.location.name}</span>
        {typeof evidence?.value === 'number' && evidence.citation ? <>
          <span>{numbers.format(evidence.value)} {t('people')}</span>
          <a href={evidence.citation.url} rel="noreferrer">{t(evidence.provider === 'abs' ? 'ABS Data API source' : 'ABS QuickStats source')}</a>
        </> : <span>{t('Not enough data')}</span>}
      </li>)}
    </ul>
  </figure>;
}
