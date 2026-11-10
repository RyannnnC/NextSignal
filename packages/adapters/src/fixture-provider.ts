import { randomUUID } from 'node:crypto';
import { Evidence } from '@kyb/contracts';
import { DomainError } from '@kyb/domain';
import type { ProviderContext, ResearchProvider } from '@kyb/application';

export class FixtureProvider implements ResearchProvider {
  readonly name = 'fixture';
  readonly version = 'fixture-v1';
  /** 按指定模拟场景生成或拒绝证据，保持合成来源标识。 */
  async collect(context: ProviderContext): Promise<Evidence[]> {
    context.signal.throwIfAborted();
    if (context.scenario === 'timeout') throw new DomainError('provider_timeout', 503);
    if (context.scenario === 'quota') throw new DomainError('quota_exceeded', 429);
    if (context.scenario === 'malformed') return [Evidence.parse({ provider: 'fixture', value: 'invalid fixture' })];
    if (context.scenario === 'missing') return [];
    const base = {
      workspaceId: context.workspaceId, projectId: context.projectId, runId: context.runId,
      provider: 'fixture', synthetic: true, licenseId: 'fixture-local-v1',
      retrievedAt: new Date().toISOString(), geography: { country: 'AU', granularity: 'national' },
      kind: 'reported', confidence: 'insufficient', stale: false,
      limitations: ['Synthetic local fixture. No real market observation was made.', 'National fixture coverage cannot establish state or city demand.']
    };
    if (context.scenario === 'contradictory') {
      return ['interest reported', 'interest disputed'].map((value, i) => Evidence.parse({ ...base, id: randomUUID(), sourceRef: `fixture:contradiction:${i}`, metric: 'interest_signal', value, confidence: 'low', stale: i === 1 }));
    }
    return [Evidence.parse({ ...base, id: randomUUID(), sourceRef: 'fixture:search-volume:unavailable', metric: 'search_volume', value: null })];
  }
}
