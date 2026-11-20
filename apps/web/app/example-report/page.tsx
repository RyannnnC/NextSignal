import { ExampleReport } from '../components/example-report';

export const metadata = { title: 'Example report' };

/** 公开示例独立于任何账户、项目或存储报告。 */
export default function Page() {
  return <ExampleReport />;
}
