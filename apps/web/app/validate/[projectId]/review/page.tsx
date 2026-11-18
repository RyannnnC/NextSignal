import { Id } from '@nextsignal/contracts';
import { notFound } from 'next/navigation';
import { ProjectStep } from '../../../project-step';

/** 校验项目路径，然后打开当前步骤。 */
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const id = Id.safeParse((await params).projectId);
  if (!id.success) notFound();
  return <ProjectStep key={id.data} id={id.data} mode="review" />;
}
