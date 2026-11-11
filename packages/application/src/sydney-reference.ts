import { randomUUID } from 'node:crypto';
import type { Profile, Report } from '@nextsignal/contracts';
import { validateReport } from '@nextsignal/domain';

/** 将人工编写的悉尼示例转换为现有报告结构，并保留来源、假设和缺失状态。 */
export function createSydneyReferenceReport(
  ids: Pick<Report, 'workspaceId' | 'projectId' | 'runId' | 'profileId'>,
  profile: Profile,
): Report {
  const createdAt = new Date().toISOString();
  const base = {
    workspaceId: ids.workspaceId, projectId: ids.projectId, runId: ids.runId,
    provider: 'fixture', synthetic: true, licenseId: 'fixture-local-v1', retrievedAt: createdAt,
    geography: profile.geography, scope: 'Sydney, New South Wales', stale: false,
  } as const;
  const competitorEvidence = randomUUID();
  const evidence = [
    { ...base, id: randomUUID(), sourceRef: 'abs:quickstats:1GSYD', classification: 'VERIFIED_SOURCE', metric: 'market_context',
      citation: { name: 'Australian Bureau of Statistics', url: 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/1GSYD', checkedOn: '2026-11-11' },
      scope: 'Greater Sydney census geography', kind: 'reported', confidence: 'high',
      value: 'The ABS publishes a distinct Greater Sydney census profile that can anchor the geographic definition for contextual research.',
      limitations: ['The 2021 Census profile is historical context. It does not measure student device faults or repair demand.'] },
    { ...base, id: competitorEvidence, sourceRef: 'apple:store:sydney', classification: 'VERIFIED_SOURCE', metric: 'competitor_observation',
      citation: { name: 'Apple Sydney store page', url: 'https://www.apple.com/au/retail/sydney/', checkedOn: '2026-11-11' },
      scope: 'Apple Sydney store, Sydney CBD', kind: 'reported', confidence: 'high',
      value: 'Apple Sydney advertises Genius support. It is one substitute to compare for customers with Apple devices.',
      limitations: ['First-party service listing. No booking availability, price, repair turnaround or market share was checked. Windows-device alternatives are still unverified.'] },
    { ...base, id: randomUUID(), sourceRef: 'fixture:sydney:keyword-seeds', classification: 'HYPOTHESIS', metric: 'keyword_hypothesis', kind: 'inferred', confidence: 'low',
      value: 'laptop repair Sydney (local service), same day laptop repair Sydney (urgency), student laptop repair Sydney (audience).',
      limitations: ['Authored query seeds. Their traffic, intent and student usage have not been measured.'] },
    { ...base, id: randomUUID(), sourceRef: 'planned:DataForSEO:search-volume-and-serp', classification: 'NOT_AVAILABLE', metric: 'search_volume', kind: 'estimated', confidence: 'insufficient',
      value: null, unit: 'searches per month', limitations: ['Use DataForSEO for supported location and language, with search volume and organic results recorded separately. Sydney-level coverage is unconfirmed.'] },
    { ...base, id: randomUUID(), sourceRef: 'planned:founder:interviews-and-pilot', classification: 'NOT_AVAILABLE', metric: 'customer_validation', kind: 'reported', confidence: 'insufficient',
      value: null, limitations: ['Founder interviews and an opt-in booking pilot are needed for fault frequency, current substitutes and willingness to pay. Search volume cannot answer these questions.'] },
  ];
  const problem = randomUUID(), alternatives = randomUUID(), commitment = randomUUID();
  return validateReport({
    ...ids, schemaVersion: '1', id: randomUUID(), synthetic: true,
    title: 'Local fixture snapshot — not market research', createdAt, geography: profile.geography, referenceProfile: profile,
    evidence,
    findings: [
      { id: problem, claimType: 'research_hypothesis', status: 'hypothesis', text: 'A device fault near an assessment deadline may make speed and trust matter more than convenience.', evidenceIds: [], counterEvidenceIds: [], validationMethod: 'Ask students to describe their most recent device fault, deadline and workaround.' },
      { id: alternatives, claimType: 'observed_fact', status: 'supported', text: 'Apple Sydney advertises Genius support for Apple customers.', evidenceIds: [competitorEvidence], counterEvidenceIds: [], validationMethod: 'Compare what Apple, independent shops and campus IT can actually handle for the same fault.' },
      { id: commitment, claimType: 'research_hypothesis', status: 'hypothesis', text: 'A campus-area drop-off and a clear diagnostic quote may earn bookings if parts and turnaround are predictable.', evidenceIds: [], counterEvidenceIds: [], validationMethod: 'Offer a manual booking with a clear quote, collection window and device privacy terms.' },
    ],
    actions: [
      { id: randomUUID(), findingId: problem, priority: 1, effort: 'small', title: 'Interview students about recent device faults', steps: 'Ask for the last fault, device type, deadline, workaround, time without the device and actual repair outcome.', rationale: 'Establish whether the problem recurs before testing an offer.', falsification: 'Students rarely report recent faults or resolve them without disruptive downtime.' },
      { id: randomUUID(), findingId: alternatives, priority: 2, effort: 'small', title: 'Compare substitutes using the same repair brief', steps: 'Record support scope, diagnostic fee, turnaround and data handling for Apple, independent shops and campus IT. Include Windows devices.', rationale: 'Find a service gap using comparable observations.', falsification: 'Accessible alternatives already meet the same speed, device and privacy needs.' },
      { id: randomUUID(), findingId: commitment, priority: 3, effort: 'small', title: 'Test an opt-in campus-area booking offer', steps: 'Show a diagnostic quote and realistic collection window. Track bookings, cancellations and completed repairs with consent.', rationale: 'Observe commitment before investing in a shop or inventory.', falsification: 'Students decline the booking or repair costs and parts delays make the offer impractical.' },
    ],
    limitations: ['Reference fixture with manually curated public citations. No live research provider or model was called.', 'Search demand, competitor coverage, repair frequency and willingness to pay are unmeasured.'],
    humanReviewed: false,
  });
}

