import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FixtureProvider, LOCAL_ACCOUNTS, openFixtureDatabase, type FixtureDatabase } from '@nextsignal/adapters';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { LOCAL_OPPORTUNITY_EXAMPLE, SydneyAreaId } from '@nextsignal/contracts';
import { presentReport, reportPath, reportReturnPath } from '../apps/web/lib/report-presentation';
import { authReturn } from '../apps/web/lib/auth-return';
import { createInput, prepared } from './helpers';

let db: FixtureDatabase;
beforeAll(async () => { db = await openFixtureDatabase(); });
afterAll(async () => { if (db) await db.close(); });
it('binds an immutable report overview to its saved profile, preserves missing evidence and rejects mismatched IDs', async () => {
  const projects = new Projects(db), actor = LOCAL_ACCOUNTS.alice;
  const {id, profileId} = await prepared(projects, actor);
  await new ResearchRunner(db,new FixtureProvider()).processOne();
  const before = await projects.get(actor,id), report = before.reports[0]!;
  await projects.confirm(actor,id,{profileId,profile:{...before.profiles[1]!.content,customer:'A newer customer statement'},requestKey:randomUUID()});
  const view = await projects.get(actor,id), original = JSON.stringify(view);
  expect(presentReport(view,id,report.id)?.profile?.customer).toBe('Australian solo founders');
  expect(presentReport(view,id,report.id)?.report.evidence[0]?.value).toBeNull();
  expect(presentReport(view,id,randomUUID())).toBeNull();
  expect(presentReport(view,randomUUID(),report.id)).toBeNull();
  expect(presentReport({...view,profiles:[]},id,report.id)?.profile).toBeNull();
  expect(JSON.stringify(view)).toBe(original);
});
it('allows only canonical internal report return paths', () => {
  const path = reportPath(randomUUID(),randomUUID());
  expect(reportReturnPath(path)).toBe(path);
  for (const invalid of ['https://example.com', '//example.com', '/validate', path+'?next=evil', path+'/..', '/projects/not-a-uuid/reports/x', ['x']]) expect(reportReturnPath(invalid)).toBeUndefined();
});

it('persists unavailable population with no recorded fallback when ABS fails', async () => {
  const projects = new Projects(db), actor = LOCAL_ACCOUNTS.alice;
  const id = await projects.create(actor, {
    ...createInput(), idea: LOCAL_OPPORTUNITY_EXAMPLE,
    localOpportunity: { category: 'computer_repair', primaryMarket: 'sydney-nsw', areaIds: SydneyAreaId.options, targetCustomer: 'Students' },
  });
  const draft = (await projects.get(actor, id)).profiles[0]!;
  const profileId = await projects.confirm(actor, id, { profileId: draft.id, profile: draft.content, requestKey: randomUUID() });
  await projects.start(actor, id, { profileId, requestKey: randomUUID() });
  await new ResearchRunner(db, new FixtureProvider(), { async population() { throw new Error('ABS offline'); } }).processOne();
  const report = (await projects.get(actor, id)).reports[0]!;
  expect(report.localOpportunity?.areas).toHaveLength(3);
  const population = report.evidence.filter(item => item.metric === 'market_context');
  expect(population).toHaveLength(3);
  expect(population.every(item => item.classification === 'NOT_AVAILABLE' && item.value === null && !item.citation)).toBe(true);
});
it('auth return accepts only supported routes with valid contract IDs', () => {
  const project = '10000000-0000-4000-8000-000000000001';
  const report = '10000000-0000-4000-8000-000000000002';
  for (const path of ['/account', '/account/reports', '/validate', `/validate/${project}/review`, `/validate/${project}/progress`, reportPath(project, report)]) {
    expect(authReturn(path)).toBe(path);
  }
  for (const path of ['//example.com', '/account?other=1', `/validate/${'-'.repeat(36)}/review`, `/projects/${project}/reports/${'-'.repeat(36)}`, ['/validate']]) {
    expect(authReturn(path)).toBe('/account');
  }
});
