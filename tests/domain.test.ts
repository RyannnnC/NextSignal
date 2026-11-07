import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Evidence, Geography, Finding, CreateProject } from '@kyb/contracts';
import { assertBudget, assertTransition, deduplicateKeywords } from '@kyb/domain';
import { createInput } from './helpers.js';

describe('contracts and domain invariants', () => {
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
