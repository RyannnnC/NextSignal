import { Id, ProjectView } from '@nextsignal/contracts';

/** 构造项目内指定报告的规范路径。 */
export function reportPath(projectId: string, reportId: string): string {
  return `/projects/${Id.parse(projectId)}/reports/${Id.parse(reportId)}`;
}
/** Allow only this app's UUID-based report route, never an arbitrary redirect. */
/** 仅接受站内的私有报告返回路径，防止开放重定向。 */
export function reportReturnPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^\/projects\/([^/]+)\/reports\/([^/]+)$/.exec(value);
  if (!match || !Id.safeParse(match[1]).success || !Id.safeParse(match[2]).success) return undefined;
  return reportPath(match[1]!, match[2]!);
}
/** 校验项目与报告的归属关系，并准备展示所需的历史资料。 */
export function presentReport(input: unknown, projectId: string, reportId: string) {
  const project = ProjectView.parse(input);
  if (project.id !== Id.parse(projectId)) return null;
  Id.parse(reportId);
  const index = project.reports.findIndex(report => report.id === reportId && report.projectId === projectId);
  const report = project.reports[index];
  if (!report) return null;
  const profile = project.profiles.find(profile => profile.id === report.profileId);
  return { report, index, profile: profile?.content ?? null };
}
