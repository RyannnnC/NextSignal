import { ReportDetail } from '../../../../components/report-detail';

export const dynamic = 'force-dynamic';
export default async function Page({params}: {params: Promise<{projectId: string;reportId: string}>}) {
  const {projectId,reportId} = await params;
  return <ReportDetail projectId={projectId} reportId={reportId}/>;
}
