import { z } from 'zod';

/** 固定本地接口的路径与方法组合，供浏览器网关和 worker 共同拒绝未声明的操作。 */
export function isFixtureRoute(path: string, method: string): boolean {
  if (path === 'health') return method === 'GET';
  if (path === 'session') return method === 'GET' || method === 'POST' || method === 'DELETE';
  if (path === 'projects') return method === 'GET' || method === 'POST';
  const match = /^projects\/([a-f0-9-]{36})(?:\/(confirm|runs|cancel))?$/.exec(path);
  if (!match?.[1] || match[0] !== path || !z.uuid().safeParse(match[1]).success) return false;
  return match[2] ? method === 'POST' : method === 'GET' || method === 'DELETE';
}

export const FIXTURE_NOTICE = 'Local fixture mode: your idea and reports stay in this local database. No external AI, search provider or marketing service receives them. Profile preparation is a deterministic placeholder, not AI research. Use test ideas only. Delete a project to remove its input, versions, runs and reports. Local fixture accounts are not production authentication.';

export const Id = z.uuid();
export const Timestamp = z.iso.datetime();
export const Geography = z.object({
  country: z.literal('AU'),
  state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']).optional(),
  granularity: z.enum(['national', 'state'])
}).strict().refine(g => g.granularity === 'state' ? Boolean(g.state) : !g.state, 'Geography must match granularity');

export const Scenario = z.enum(['normal', 'missing', 'contradictory', 'timeout', 'malformed', 'quota']);
export const SYDNEY_REFERENCE_IDEA = 'A computer repair service targeting international students in Sydney.';
/** 匹配固定参考案例，同时容许省略句号和调整大小写。 */
export function isSydneyReferenceIdea(idea: string): boolean {
  return idea.trim().replace(/\.$/, '').toLowerCase() === SYDNEY_REFERENCE_IDEA.slice(0, -1).toLowerCase();
}
export const ClaimType = z.enum(['observed_fact', 'third_party_estimate', 'founder_statement', 'ai_hypothesis', 'research_hypothesis']);
export const RunStatus = z.enum(['queued', 'planning', 'collecting', 'analysing', 'validating', 'completed', 'partial', 'failed', 'cancelled']);
export const Profile = z.object({
  summary: z.string().trim().min(1).max(3000),
  customer: z.string().trim().min(1).max(500),
  problem: z.string().trim().min(1).max(1000),
  geography: Geography,
  assumptions: z.array(z.string().min(1).max(500)).max(8)
}).strict();
export const CreateProject = z.object({
  idea: z.string().trim().min(10).max(3000),
  geography: Geography,
  processingConsent: z.literal(true),
  noticeVersion: z.literal('local-fixture-v1'),
  marketingOptIn: z.boolean().default(false),
  scenario: Scenario.default('normal'),
  requestKey: Id
}).strict();
export const ConfirmProfile = z.object({ profileId: Id, profile: Profile, requestKey: Id }).strict();
export const StartRun = z.object({ profileId: Id, requestKey: Id }).strict();
export const Login = z.object({ account: z.enum(['alice', 'bob']) }).strict();

export const Evidence = z.object({
  id: Id, workspaceId: Id, projectId: Id, runId: Id,
  provider: z.literal('fixture'), synthetic: z.literal(true),
  sourceRef: z.string().min(1), licenseId: z.literal('fixture-local-v1'),
  classification: z.enum(['VERIFIED_SOURCE', 'RECORDED_SAMPLE', 'HYPOTHESIS', 'NOT_AVAILABLE']).optional(),
  citation: z.object({ name: z.string().min(1), url: z.url({ protocol: /^https$/ }), checkedOn: z.iso.date() }).strict().optional(),
  scope: z.string().min(1).optional(),
  retrievedAt: Timestamp,
  observedPeriod: z.object({ from: Timestamp, to: Timestamp }).strict().optional(),
  geography: Geography,
  metric: z.enum(['search_volume', 'customer_question', 'interest_signal', 'market_context', 'competitor_observation', 'keyword_hypothesis', 'customer_validation']),
  value: z.union([z.number().finite(), z.string(), z.null()]),
  unit: z.string().min(1).optional(),
  kind: z.enum(['measured', 'estimated', 'reported', 'inferred']),
  confidence: z.enum(['high', 'medium', 'low', 'insufficient']),
  limitations: z.array(z.string().min(1)).min(1),
  stale: z.boolean()
}).strict().superRefine((e, ctx) => {
  if (e.classification === 'NOT_AVAILABLE' && e.value !== null) ctx.addIssue({ code: 'custom', message: 'Unavailable evidence must have a null value' });
  if ((e.classification === 'VERIFIED_SOURCE' || e.classification === 'RECORDED_SAMPLE') && (!e.citation || e.value === null || !e.scope)) {
    ctx.addIssue({ code: 'custom', message: 'Sourced evidence requires a citation, scope and value' });
  }
  if (typeof e.value === 'number' && (!e.unit || !e.observedPeriod)) {
    ctx.addIssue({ code: 'custom', message: 'Numeric evidence requires unit and observed period' });
  }
  if (e.value === null && e.confidence !== 'insufficient') {
    ctx.addIssue({ code: 'custom', message: 'Missing evidence must retain insufficient confidence' });
  }
  if (e.observedPeriod && e.observedPeriod.from > e.observedPeriod.to) {
    ctx.addIssue({ code: 'custom', message: 'Invalid observation period' });
  }
});
const Narrative = z.string().min(1).max(1500).refine(s => !/\d/.test(s), 'Numeric assertions must use a typed numeric claim');
export const Finding = z.object({
  id: Id,
  claimType: ClaimType,
  text: Narrative,
  status: z.enum(['supported', 'hypothesis', 'contradicted', 'unknown']),
  evidenceIds: z.array(Id), counterEvidenceIds: z.array(Id),
  numeric: z.object({ evidenceId: Id, value: z.number().finite(), unit: z.string().min(1), geography: Geography, observedPeriod: z.object({ from: Timestamp, to: Timestamp }).strict() }).strict().optional(),
  validationMethod: Narrative
}).strict();
export const Action = z.object({
  id: Id, findingId: Id, priority: z.number().int().min(1).max(3),
  title: Narrative, steps: Narrative, falsification: Narrative,
  rationale: Narrative, effort: z.enum(['small', 'medium'])
}).strict();
export const Report = z.object({
  schemaVersion: z.literal('1'), id: Id, workspaceId: Id, projectId: Id, runId: Id, profileId: Id,
  synthetic: z.literal(true), title: z.literal('Local fixture snapshot — not market research'),
  createdAt: Timestamp, geography: Geography,
  referenceProfile: Profile.optional(),
  evidence: z.array(Evidence), findings: z.array(Finding).min(1), actions: z.array(Action).length(3),
  limitations: z.array(z.string()).min(1), humanReviewed: z.literal(false)
}).strict();
export const ProfileVersion = z.object({ id: Id, version: z.number().int().positive(), status: z.enum(['awaiting_confirmation', 'confirmed']), content: Profile, createdAt: Timestamp });
export const Run = z.object({ id: Id, profileId: Id, status: RunStatus, errorCode: z.string().nullable(), createdAt: Timestamp });
export const ProjectView = z.object({
  id: Id, stage: z.enum(['idea', 'launch', 'growth']), scenario: Scenario,
  profiles: z.array(ProfileVersion), runs: z.array(Run), reports: z.array(Report)
}).strict();
export const SessionView = z.object({ account: z.enum(['alice', 'bob']), workspaceId: Id }).strict();
export const ApiError = z.object({ error: z.string(), code: z.string() }).strict();

export type Geography = z.infer<typeof Geography>;
export type Profile = z.infer<typeof Profile>;
export type Evidence = z.infer<typeof Evidence>;
export type Finding = z.infer<typeof Finding>;
export type Report = z.infer<typeof Report>;
export type Scenario = z.infer<typeof Scenario>;
export type RunStatus = z.infer<typeof RunStatus>;
export type ProjectView = z.infer<typeof ProjectView>;
