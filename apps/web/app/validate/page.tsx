import { Id } from '@kyb/contracts';
import { FixtureApp } from '../ui';
import { reportReturnPath } from '../../lib/report-presentation';

/** 解析校验页参数，并将安全的报告返回路径传给本地流程。 */
export default async function Page({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const query = await searchParams;
  const id = Id.safeParse(query.projectId);
  return <FixtureApp initialProjectId={id.success ? id.data : undefined} returnTo={reportReturnPath(query.next)}/>;
}
