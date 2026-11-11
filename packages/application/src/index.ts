import type { Evidence, Profile, Scenario } from '@nextsignal/contracts';

export interface ProviderContext {
  workspaceId: string; projectId: string; runId: string;
  scenario: Scenario; profile: Profile;
  signal: AbortSignal;
}
export interface ResearchProvider {
  readonly name: 'fixture';
  readonly version: string;
  collect(context: ProviderContext): Promise<Evidence[]>;
}
export type SqlResult<T> = { rows: T[] };
export interface Transaction {
  query<T>(sql: string, parameters?: unknown[]): Promise<SqlResult<T>>;
}
export interface Database {
  asUser<T>(userId: string, work: (tx: Transaction) => Promise<T>): Promise<T>;
  claimJob(): Promise<{ id: string; workspaceId: string; userId: string; runId: string; leaseToken: string; attempts: number } | null>;
}
export interface Actor { userId: string; workspaceId: string }
