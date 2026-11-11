import type { Metadata } from 'next';
import { MarketingHome } from './components/marketing-home';

export const metadata: Metadata = {
  title: 'Test your business idea in Australia | NextSignal',
  description: 'Explore an Australian business idea, see what to check before launch, and try a free example report with practical next steps.',
};

/** 渲染公开首页。 */
export default function Page() { return <MarketingHome />; }
