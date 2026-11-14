import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Evidence, isSydneyReferenceIdea, Profile, RunStatus, Scenario, type Report } from '@nextsignal/contracts';
import { assertBudget, assertTransition, DomainError, validateReport } from '@nextsignal/domain';
import type { AbsPopulationProvider, Database, ResearchProvider, Transaction } from './index.js';
import { createSydneyReferenceReport } from './sydney-reference.js';
import { createLocalOpportunityReport } from './local-opportunity.js';

const RunRow = z.object({ id: z.uuid(), workspace_id: z.uuid(), project_id: z.uuid(), profile_id: z.uuid(), status: RunStatus, max_calls: z.number(), calls_used: z.number(), scenario: Scenario, idea: z.string(), content: Profile });
type RunRow = z.infer<typeof RunRow>;
type Job = NonNullable<Awaited<ReturnType<Database['claimJob']>>>;
/** 通过已领取的任务查找对应研究运行及上下文。 */
async function load(tx: Transaction, job: Job): Promise<RunRow | null> {
  const lease = await tx.query('select id from public.jobs where id=$1 and status=$2 and lease_token=$3 for update', [job.id, 'running', job.leaseToken]);
  if (!lease.rows.length) return null;
  const result = await tx.query(`select r.*,p.scenario,p.idea,v.content from public.research_runs r join public.projects p on p.id=r.project_id join public.profile_versions v on v.id=r.profile_id where r.id=$1 for update of r`, [job.runId]);
  return result.rows.length ? RunRow.parse(result.rows[0]) : null;
}
/** 检查研究状态变化是否合法并记录运行事件。 */
async function transition(tx: Transaction, run: RunRow, to: z.infer<typeof RunStatus>, code: string | null = null) {
  assertTransition(run.status, to);
  await tx.query('update public.research_runs set status=$2,error_code=$3 where id=$1', [run.id, to, code]);
  await tx.query('insert into public.run_events(workspace_id,project_id,run_id,from_status,to_status,code) values($1,$2,$3,$4,$5,$6)', [run.workspace_id, run.project_id, run.id, run.status, to, code]);
  run.status = to;
}
export class ResearchRunner {
  /** 注入数据库和具有明确能力边界的研究提供器。 */
  constructor(private readonly db: Database, private readonly provider: ResearchProvider, private readonly abs?: AbsPopulationProvider) {}
  /** 处理一条有租约的任务，写入证据和报告或记录失败。 */
  async processOne(): Promise<boolean> {
    const job = await this.db.claimJob();
    if (!job) return false;
    try {
      const run = await this.db.asUser(job.userId, async tx => {
        const run = await load(tx, job);
        if (!run || run.status === 'cancelled') return null;
        if (run.status === 'queued') await transition(tx, run, 'planning');
        if (run.status === 'planning') await transition(tx, run, 'collecting');
        if (run.status !== 'collecting') throw new DomainError('invalid_resume_state');
        assertBudget(run.calls_used, 1, run.max_calls);
        await tx.query('update public.research_runs set calls_used=calls_used+1 where id=$1', [run.id]);
        await tx.query("insert into public.provider_calls(workspace_id,project_id,run_id,provider,attempt,status) values($1,$2,$3,'fixture',$4,'reserved')", [run.workspace_id, run.project_id, run.id, run.calls_used + 1]);
        return run;
      });
      if (!run) return true;
      const reference = run.scenario === 'normal' && isSydneyReferenceIdea(run.idea) && isSydneyReferenceIdea(run.content.summary) && run.content.geography.state === 'NSW';
      const ids = { workspaceId: run.workspace_id, projectId: run.project_id, runId: run.id, profileId: run.profile_id };
      const local = run.scenario === 'normal' ? run.content.localOpportunity : undefined;
      const abs = local && this.abs ? await (this.abs.regional?.(local.areaIds, AbortSignal.timeout(16_000)) ??
        this.abs.population(local.areaIds, AbortSignal.timeout(16_000)).then(result => ({ C21_G01_SAL: result })))
        .catch(() => ({ C21_G01_SAL: 'invalid_response' } as const)) : undefined;
      const signal = AbortSignal.timeout(1000);
      const report = local
        ? createLocalOpportunityReport(ids, run.content, local, abs)
        : reference ? createSydneyReferenceReport(ids, run.content)
        : makeFixtureReport(run, z.array(Evidence).parse(await this.provider.collect({ workspaceId: run.workspace_id, projectId: run.project_id, runId: run.id, scenario: run.scenario, profile: run.content, signal })));
      signal.throwIfAborted();
      await this.db.asUser(job.userId, async tx => {
        const current = await load(tx, job);
        if (!current || current.status === 'cancelled') return;
        await transition(tx, current, 'analysing');
        await transition(tx, current, 'validating');
        validateReport(report);
        for (const item of report.evidence) await tx.query('insert into public.evidence_records(id,workspace_id,project_id,run_id,payload) values($1,$2,$3,$4,$5)', [item.id, current.workspace_id, current.project_id, current.id, item]);
        for (const finding of report.findings) {
          await tx.query('insert into public.findings(id,workspace_id,project_id,run_id,payload) values($1,$2,$3,$4,$5)', [finding.id, current.workspace_id, current.project_id, current.id, finding]);
          for (const [relation, ids] of [['supports', finding.evidenceIds], ['contradicts', finding.counterEvidenceIds]] as const) {
            for (const id of ids) await tx.query('insert into public.finding_evidence_links(workspace_id,project_id,run_id,finding_id,evidence_id,relation) values($1,$2,$3,$4,$5,$6)', [current.workspace_id, current.project_id, current.id, finding.id, id, relation]);
          }
        }
        for (const action of report.actions) await tx.query('insert into public.action_items(id,workspace_id,project_id,run_id,finding_id,payload) values($1,$2,$3,$4,$5,$6)', [action.id, current.workspace_id, current.project_id, current.id, action.findingId, action]);
        await tx.query('insert into public.report_versions(id,workspace_id,project_id,run_id,payload) values($1,$2,$3,$4,$5)', [report.id, current.workspace_id, current.project_id, current.id, report]);
        await tx.query("update public.provider_calls set status='completed' where run_id=$1 and status='reserved'", [current.id]);
        await transition(tx, current, 'partial');
        await tx.query("update public.jobs set status='done',lease_until=null,lease_token=null where id=$1", [job.id]);
      });
    } catch (error) {
      const code = error instanceof DomainError ? error.code : error instanceof z.ZodError ? 'invalid_provider_output' : 'worker_error';
      await this.db.asUser(job.userId, async tx => {
        const run = await load(tx, job);
        if (!run || ['cancelled', 'partial', 'completed', 'failed'].includes(run.status)) return;
        await tx.query("update public.provider_calls set status='failed' where run_id=$1 and status='reserved'", [run.id]);
        const retry = ['provider_timeout', 'invalid_provider_output'].includes(code) && job.attempts < 2 && run.calls_used < run.max_calls;
        if (retry) {
          await tx.query("update public.jobs set status='queued',lease_until=null,lease_token=null,available_at=now()+interval '100 milliseconds' where id=$1", [job.id]);
          await tx.query('insert into public.run_events(workspace_id,project_id,run_id,from_status,to_status,code) values($1,$2,$3,$4,$4,$5)', [run.workspace_id, run.project_id, run.id, run.status, 'retry_scheduled']);
        } else {
          await transition(tx, run, 'failed', code);
          await tx.query("update public.jobs set status='dead',lease_until=null,lease_token=null where id=$1", [job.id]);
        }
      });
    }
    return true;
  }
}

/** 使用已归一化的合成证据构造版本化报告。 */
function makeFixtureReport(run: RunRow, evidence: Evidence[]): Report {
  const findingId = randomUUID();
  const contradictory = run.scenario === 'contradictory';
  const actions = [
    { title: 'Interview intended customers', steps: 'Ask about recent attempts to solve the stated problem before describing a solution.', falsification: 'Customers do not recognise the problem or already solve it adequately.', rationale: 'Test problem relevance before investing in implementation.' },
    { title: 'Compare existing alternatives', steps: 'Ask customers which substitutes they actually use and document their answers.', falsification: 'An accessible substitute already meets the need.', rationale: 'Discover real alternatives without inventing competitors.' },
    { title: 'Test a concrete commitment', steps: 'Offer a clearly described manual pilot and record voluntary responses.', falsification: 'Interested respondents decline a meaningful next step.', rationale: 'Separate polite interest from an actionable commitment.' }
  ];
  return validateReport({
    schemaVersion: '1', id: randomUUID(), workspaceId: run.workspace_id, projectId: run.project_id, runId: run.id, profileId: run.profile_id,
    synthetic: true, title: 'Local fixture snapshot — not market research', createdAt: new Date().toISOString(), geography: run.content.geography,
    evidence,
    findings: [{ id: findingId, claimType: 'ai_hypothesis', text: contradictory ? 'Synthetic sources disagree about interest. Real demand remains unknown.' : 'Customer demand and willingness to pay remain unknown.', status: contradictory ? 'contradicted' : 'unknown', evidenceIds: evidence.slice(0, 1).map(e => e.id), counterEvidenceIds: contradictory ? evidence.slice(1).map(e => e.id) : [], validationMethod: 'Seek direct customer evidence that could disprove the business hypothesis.' }],
    actions: actions.map((a, i) => ({ ...a, id: randomUUID(), findingId, priority: i + 1, effort: 'small' })),
    limitations: ['Synthetic fixture only. No external AI or data provider was called.', 'The actions are fixed development templates, not personalised research.', 'Search demand, competitors and market size have not been established.'], humanReviewed: false
  });
}
