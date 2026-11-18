import { Id } from '@nextsignal/contracts';
import { redirect } from 'next/navigation';
import { IdeaEntry } from '../ui';
import { reportReturnPath } from '../../lib/report-presentation';

/** 保留旧项目链接，同时让创意页只负责输入。 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const id = Id.safeParse(query.projectId);
  if (id.success) redirect(`/validate/${id.data}/review`);
  const next = reportReturnPath(query.next);
  if (next) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return <IdeaEntry />;
}
