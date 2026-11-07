import { Report, type Evidence, type RunStatus } from '@kyb/contracts';

export class DomainError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}
const transitions: Record<RunStatus, readonly RunStatus[]> = {
  queued: ['planning', 'cancelled', 'failed'], planning: ['collecting', 'cancelled', 'failed'],
  collecting: ['analysing', 'cancelled', 'failed'], analysing: ['validating', 'cancelled', 'failed'],
  validating: ['completed', 'partial', 'cancelled', 'failed'],
  completed: [], partial: [], failed: [], cancelled: []
};
export function assertTransition(from: RunStatus, to: RunStatus): void {
  if (!transitions[from].includes(to)) throw new DomainError('invalid_transition', 409);
}
export function assertBudget(used: number, reserved: number, limit: number): void {
  if (![used, reserved, limit].every(n => Number.isSafeInteger(n) && n >= 0) || used + reserved > limit) {
    throw new DomainError('budget_exceeded', 429);
  }
}
export function deduplicateKeywords(keywords: readonly string[]): string[] {
  return [...new Set(keywords.map(k => k.normalize('NFKC').trim().toLocaleLowerCase('en-AU').replace(/\s+/g, ' ')).filter(Boolean))];
}
export function validateReport(input: unknown): Report {
  const report = Report.parse(input);
  const evidence = new Map<string, Evidence>();
  for (const item of report.evidence) {
    if (evidence.has(item.id) || item.workspaceId !== report.workspaceId || item.projectId !== report.projectId || item.runId !== report.runId) throw new DomainError('invalid_evidence_scope');
    evidence.set(item.id, item);
  }
  const findingIds = new Set<string>();
  for (const finding of report.findings) {
    if (findingIds.has(finding.id)) throw new DomainError('duplicate_finding');
    findingIds.add(finding.id);
    for (const id of [...finding.evidenceIds, ...finding.counterEvidenceIds]) if (!evidence.has(id)) throw new DomainError('missing_evidence');
    if (finding.status === 'supported' && (finding.evidenceIds.length === 0 || finding.evidenceIds.every(id => evidence.get(id)?.value === null))) throw new DomainError('unsupported_claim');
    if (finding.status === 'contradicted' && finding.counterEvidenceIds.length === 0) throw new DomainError('missing_counter_evidence');
    if (finding.numeric) {
      const source = evidence.get(finding.numeric.evidenceId);
      if (!finding.evidenceIds.includes(finding.numeric.evidenceId) || !source || source.value !== finding.numeric.value || source.unit !== finding.numeric.unit || JSON.stringify(source.geography) !== JSON.stringify(finding.numeric.geography) || JSON.stringify(source.observedPeriod) !== JSON.stringify(finding.numeric.observedPeriod)) throw new DomainError('ungrounded_numeric_claim');
    }
  }
  if (new Set(report.actions.map(a => a.priority)).size !== 3 || new Set(report.actions.map(a => a.id)).size !== 3) throw new DomainError('invalid_priorities');
  for (const action of report.actions) if (!findingIds.has(action.findingId)) throw new DomainError('missing_finding');
  return report;
}
