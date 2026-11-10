import { randomUUID } from 'node:crypto';
import type { Projects } from '@kyb/application/projects';
import type { Actor } from '@kyb/application';
import type { Scenario } from '@kyb/contracts';

/** 创建带独立幂等键的合成项目请求。 */
export const createInput = (scenario: Scenario = 'normal') => ({
  idea: 'A test service helping Australian founders compare business hypotheses', geography: { country: 'AU' as const, granularity: 'national' as const },
  processingConsent: true as const, noticeVersion: 'local-fixture-v1' as const, marketingOptIn: false,
  scenario, requestKey: randomUUID()
});
/** 创建项目并确认资料，然后提交 fixture 研究任务。 */
export async function prepared(projects: Projects, actor: Actor, scenario: Scenario = 'normal') {
  const id = await projects.create(actor, createInput(scenario));
  const initial = (await projects.get(actor, id)).profiles.at(-1)!;
  const profileId = await projects.confirm(actor, id, { profileId: initial.id, profile: { ...initial.content, customer: 'Australian solo founders', problem: 'Unclear evidence for a business hypothesis' }, requestKey: randomUUID() });
  const runId = await projects.start(actor, id, { profileId, requestKey: randomUUID() });
  return { id, profileId, runId };
}
