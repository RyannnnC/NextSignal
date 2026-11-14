import { randomUUID } from 'node:crypto';
import { Evidence, SYDNEY_AREAS, type LocalGeography, type LocalOpportunityComparison, type LocalOpportunityInput, type Profile, type Report } from '@nextsignal/contracts';
import { validateReport } from '@nextsignal/domain';
import type { AbsResults } from './index.js';

const censusVersion = 'ABS ASGS Edition 3 / 2021 Census';
const population = { haymarket: 8305, 'burwood-nsw': 18224, chatswood: 25553 } as const;
const observation = '2021-08-10T00:00:00.000Z';
const indicators = [
  { flow: 'C21_G01_SAL', metric: 'market_context', unit: 'people', measure: undefined, limitation: 'Historical Census population for the statistical locality. It does not measure students, repair customers, current foot traffic or a service catchment.' },
  { flow: 'C21_G02_SAL', metric: 'household_income', unit: 'AUD/week', measure: undefined, limitation: 'Median total weekly household income for eligible occupied private dwellings. ABS excludes certain households with missing income, temporarily absent members, visitors only or unclassifiable households. It does not measure willingness to pay.' },
  { flow: 'C21_G04_SAL', metric: 'resident_age_group', unit: 'people', measure: '20_24', limitation: 'Counts usual residents by age with ABS confidentiality adjustments. Age does not establish student status or repair demand.' },
  { flow: 'C21_G04_SAL', metric: 'resident_age_group', unit: 'people', measure: '25_29', limitation: 'Counts usual residents by age with ABS confidentiality adjustments. Age does not establish student status or repair demand.' },
] as const;

/** 从已核对的 ABS 目录获取候选区的统计边界和版本。 */
function locationFor(id: keyof typeof SYDNEY_AREAS): LocalGeography {
  const area = SYDNEY_AREAS[id];
  return { name: area.name, country: 'AU', state: 'NSW', type: 'locality', mapping: { status: 'verified', sourceId: area.sourceId, datasetVersion: censusVersion } };
}

/** 只有地区、地理口径和来源版本匹配的证据才可进入地区比较。 */
export function compareLocalOpportunity(input: LocalOpportunityInput, evidence: Evidence[]): LocalOpportunityComparison {
  return { input, areas: input.areaIds.map(id => {
    const location = locationFor(id);
    const evidenceIds = evidence.filter(item => {
      const area = item.localArea;
      return area?.id === id && area.location.type === location.type && area.location.state === location.state &&
        area.location.mapping.status === 'verified' && location.mapping.status === 'verified' &&
        area.location.mapping.sourceId === location.mapping.sourceId && area.location.mapping.datasetVersion === location.mapping.datasetVersion;
    }).map(item => item.id);
    return { id, location, evidenceIds };
  }) };
}

/** 生成地区比较报告，按统计地区编码关联实时查询或离线记录。 */
export function createLocalOpportunityReport(ids: Pick<Report, 'workspaceId' | 'projectId' | 'runId' | 'profileId'>, profile: Profile, input: LocalOpportunityInput, abs?: AbsResults): Report {
  const createdAt = new Date().toISOString();
  const geography = { country: 'AU', state: 'NSW', granularity: 'state' } as const;
  const evidence = input.areaIds.flatMap(id => {
    const area = SYDNEY_AREAS[id];
    const base = { workspaceId: ids.workspaceId, projectId: ids.projectId, runId: ids.runId, provider: 'fixture', synthetic: true, licenseId: 'fixture-local-v1', retrievedAt: createdAt, geography, localArea: { id, location: locationFor(id) }, scope: `${area.name} — ABS Suburbs and Localities` };
    const region = area.sourceId.slice(3);
    const statistics = indicators.flatMap(({ flow, metric, unit, measure, limitation }) => {
      const candidate = abs?.[flow];
      if (candidate === undefined && flow !== 'C21_G01_SAL') return [];
      const snapshot = typeof candidate === 'object' ? candidate : undefined;
      const observed = snapshot?.observations.find(item => item.region === region && item.measure === measure);
      const value = abs === undefined ? population[id] : observed?.value ?? null;
      const failure = value !== null ? undefined : typeof candidate === 'string' ? candidate :
        observed?.status && !['A', 'M'].includes(observed.status) ? 'suppressed_observation' : 'missing_observation';
      const census = {
        ...base, id: randomUUID(), metric, value, unit, kind: 'measured', confidence: value === null ? 'insufficient' : 'high',
        stale: true, observedPeriod: { from: observation, to: observation },
        attribution: { license: 'CC BY 4.0 · Australian Bureau of Statistics', url: 'https://www.abs.gov.au/website-privacy-copyright-and-disclaimer' },
        limitations: [limitation], absUnavailable: failure,
      };
      const populationEvidence = snapshot ? {
        ...census, provider: 'abs', synthetic: false, licenseId: 'abs-census-cc-by-4', retrievedAt: snapshot.collectedAt,
        sourceRef: `abs:${flow}:${snapshot.dataflowVersion}:${region}:2021:${measure ?? unit}`,
        classification: value === null ? 'NOT_AVAILABLE' : 'VERIFIED_SOURCE',
        abs: { dataflowId: flow, dataflowVersion: snapshot.dataflowVersion, structureVersion: snapshot.structureVersion, region, period: '2021', measure, observationStatus: observed?.status },
        citation: { name: 'Australian Bureau of Statistics · ABS Data API · 2021 Census', url: snapshot.sourceUrl, checkedOn: snapshot.collectedAt.slice(0, 10) },
      } : abs === undefined ? {
        ...census, sourceRef: `abs:2021:quickstats:${area.sourceId}:people`, classification: 'RECORDED_SAMPLE',
        citation: { name: 'Australian Bureau of Statistics · 2021 Census QuickStats', url: `https://www.abs.gov.au/census/find-census-data/quickstats/2021/${area.sourceId}`, checkedOn: '2026-11-12' },
      } : { ...census, sourceRef: `abs:${flow}:${measure ?? unit}:unavailable`, classification: 'NOT_AVAILABLE' };
      return [Evidence.parse(populationEvidence)];
    });
    return [
      ...statistics,
      Evidence.parse({ ...base, id: randomUUID(), metric: 'search_volume', value: null, kind: 'estimated', confidence: 'insufficient', stale: false,
        sourceRef: 'planned:DataForSEO:local-demand', classification: 'NOT_AVAILABLE', limitations: ['No search data was collected at this geographic scope. A broader Sydney result cannot fill this suburb field.'] }),
      Evidence.parse({ ...base, id: randomUUID(), metric: 'competitor_observation', value: null, kind: 'reported', confidence: 'insufficient', stale: false,
        sourceRef: 'planned:licensed-local-listings', classification: 'NOT_AVAILABLE', limitations: ['A licensed listing source and first-party checks are needed to confirm repair providers and their offers.'] }),
    ];
  });
  const findingId = randomUUID();
  return validateReport({
    ...ids, id: randomUUID(), schemaVersion: '1', synthetic: true, title: 'Local Opportunity Brief', createdAt, geography,
    localOpportunity: compareLocalOpportunity(input, evidence), referenceProfile: profile, evidence,
    findings: [{ id: findingId, claimType: 'research_hypothesis', status: 'hypothesis',
      text: 'A clear diagnostic quote and a convenient drop-off could matter more than neighbourhood population.', evidenceIds: [], counterEvidenceIds: [],
      validationMethod: 'Ask prospective customers how they handled their last repair and what would make them book again.' }],
    actions: [
      { title: 'Check real repair needs', steps: 'Ask prospective customers in each area about recent faults, urgency and workarounds.', rationale: 'Compare behaviour before estimating demand.', falsification: 'Few people recall a recent fault or already have a satisfactory option.' },
      { title: 'Compare local alternatives', steps: 'Verify local providers on their own sites and compare the same device fault, diagnostic fee and turnaround.', rationale: 'See whether customers already have a suitable alternative.', falsification: 'Existing providers meet the same device, turnaround and privacy needs.' },
      { title: 'Price a small pilot', steps: 'Get quotes for tools, parts, insurance and drop-off. Compare the total with your stated budget before making commitments.', rationale: 'Test the setup cost before taking on fixed expenses.', falsification: 'Pilot costs exceed your budget or bookings cannot cover direct repair costs.' },
    ].map((action, index) => ({ ...action, id: randomUUID(), findingId, priority: index + 1, effort: 'small' })),
    limitations: [abs ? 'ABS evidence uses historical 2021 Census observations where available.' : 'Offline reference with recorded Census context.',
      'Demand, competitor coverage, setup costs and willingness to pay remain unverified.', 'Candidate locations are illustrative. No profit forecast or area ranking was produced.'], humanReviewed: false,
  });
}
