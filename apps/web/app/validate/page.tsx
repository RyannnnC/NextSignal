import { Id } from '@kyb/contracts';
import { FixtureApp } from '../ui';
import { reportReturnPath } from '../../lib/report-presentation';

export default async function Page({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const query = await searchParams;
  const id = Id.safeParse(query.projectId);
  return <FixtureApp initialProjectId={id.success ? id.data : undefined} returnTo={reportReturnPath(query.next)}/>;
}
