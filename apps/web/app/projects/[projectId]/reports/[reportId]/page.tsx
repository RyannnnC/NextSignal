import { ReportDetail } from '../../../../components/report-detail';

export const dynamic = 'force-dynamic';
/** 解析并校验报告路由参数，再交给私有报告视图。 */
export default async function Page({params}: {params: Promise<{projectId: string;reportId: string}>}) {
  const {projectId,reportId} = await params;
  return <ReportDetail projectId={projectId} reportId={reportId}/>;
}
