import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Evidence, Geography, Finding, CreateProject, LocalGeography, LocalOpportunityInput, Profile } from '@nextsignal/contracts';
import { assertBudget, assertTransition, deduplicateKeywords, validateReport } from '@nextsignal/domain';
import { compareLocalOpportunity, createLocalOpportunityReport } from '../packages/application/src/local-opportunity.js';
import { createInput } from './helpers.js';

describe('contracts and domain invariants', () => {
  it('validates up to three distinct Sydney localities and preserves unresolved source mappings', () => {
    const base = { category: 'computer_repair', primaryMarket: 'sydney-nsw' };
    expect(LocalOpportunityInput.safeParse({ ...base, areaIds: ['haymarket', 'burwood-nsw', 'chatswood'], budgetAud: 0 }).success).toBe(true);
    for (const areaIds of [[], ['sydney'], ['haymarket', 'haymarket'], ['haymarket', 'burwood-nsw', 'chatswood', 'haymarket']]) {
      expect(LocalOpportunityInput.safeParse({ ...base, areaIds }).success).toBe(false);
    }
    expect(LocalOpportunityInput.safeParse({ ...base, areaIds: ['haymarket'], budgetAud: -1 }).success).toBe(false);
    expect(LocalGeography.parse({ name: 'Unresolved candidate', country: 'AU', state: 'NSW', type: 'lga', mapping: { status: 'unresolved', limitation: 'No verified boundary' } }).name).toBe('Unresolved candidate');
  });
  it('keeps mismatched geography and unavailable metrics out of local numeric comparisons', () => {
    const input = LocalOpportunityInput.parse({ category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: ['haymarket'] });
    const profile = Profile.parse({ summary: 'Computer repair for Sydney students', customer: 'Students', problem: 'Device faults', geography: { country: 'AU', state: 'NSW', granularity: 'state' }, assumptions: [], localOpportunity: input });
    const report = createLocalOpportunityReport({ workspaceId: randomUUID(), projectId: randomUUID(), runId: randomUUID(), profileId: randomUUID() }, profile, input);
    expect(validateReport(JSON.parse(JSON.stringify(report)))).toEqual(report);
    expect(report.evidence.filter(item => item.classification === 'NOT_AVAILABLE').map(item => item.value)).toEqual([null, null]);
    const item = report.evidence[0]!;
    const mismatch = Evidence.parse({ ...item, localArea: { ...item.localArea!, location: { ...item.localArea!.location, type: 'sa2' } } });
    expect(compareLocalOpportunity(input, [mismatch]).areas[0]?.evidenceIds).toEqual([]);
    expect(compareLocalOpportunity(input, []).areas[0]?.evidenceIds).toEqual([]);
    expect(Evidence.safeParse({ ...report.evidence[1], value: 0 }).success).toBe(false);
    expect(() => validateReport({ ...report, evidence: [mismatch, ...report.evidence.slice(1)] })).toThrow('invalid_local_evidence_scope');
  });
  it('rejects missing consent, excessive idea length, unknown fields and URL entry', () => {
    const input = createInput();
    for (const bad of [{ ...input, processingConsent: false }, { ...input, idea: 'x'.repeat(3001) }, { ...input, website: 'http://127.0.0.1' }, { ...input, noticeVersion: 'old' }]) expect(CreateProject.safeParse(bad).success).toBe(false);
  });
  it('preserves geographic granularity and rejects unsupported locality', () => {
    expect(Geography.safeParse({ country: 'AU', granularity: 'national', state: 'NSW' }).success).toBe(false);
    expect(Geography.safeParse({ country: 'AU', granularity: 'state', state: 'NSW' }).success).toBe(true);
    expect(Geography.safeParse({ country: 'AU', granularity: 'national', locality: 'Sydney' }).success).toBe(false);
  });
  it('rejects unsupported statistics in narrative claims', () => {
    expect(Finding.safeParse({ id: randomUUID(), claimType: 'ai_hypothesis', text: 'Demand is 5000 buyers', status: 'hypothesis', evidenceIds: [], counterEvidenceIds: [], validationMethod: 'Interview customers' }).success).toBe(false);
  });
  it('requires units and period for numeric evidence and distinguishes null from zero', () => {
    const base = { id: randomUUID(), workspaceId: randomUUID(), projectId: randomUUID(), runId: randomUUID(), provider: 'fixture', synthetic: true, sourceRef: 'fixture:unit-test', licenseId: 'fixture-local-v1', retrievedAt: new Date().toISOString(), geography: { country: 'AU', granularity: 'national' }, metric: 'search_volume', kind: 'estimated', confidence: 'low', limitations: ['Synthetic only'], stale: false };
    expect(Evidence.safeParse({ ...base, value: 0 }).success).toBe(false);
    const numeric = Evidence.parse({ ...base, value: 0, unit: 'searches/month', observedPeriod: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' } });
    expect(numeric.value).toBe(0);
    expect(Evidence.safeParse({ ...base, value: null }).success).toBe(false);
    expect(Evidence.parse({ ...base, value: null, confidence: 'insufficient' }).value).toBeNull();
  });
  it('enforces terminal states and safe cost arithmetic', () => {
    expect(() => assertTransition('queued', 'planning')).not.toThrow();
    for (const terminal of ['completed', 'partial', 'failed', 'cancelled'] as const) expect(() => assertTransition(terminal, 'collecting')).toThrow();
    expect(() => assertBudget(1, 1, 2)).not.toThrow();
    for (const numbers of [[2, 1, 2], [-1, 0, 2], [0.1, 1, 2], [Infinity, 0, 2]]) expect(() => assertBudget(numbers[0]!, numbers[1]!, numbers[2]!)).toThrow();
  });
  it('normalises Unicode and whitespace without duplicating keywords', () => {
    expect(deduplicateKeywords(['  Business  Research ', 'business research', 'Ｂｕｓｉｎｅｓｓ research', ''])).toEqual(['business research']);
  });
});
