import type { Metadata } from 'next';
import './globals.css';
import { SiteShell } from './components/site-shell';

export const metadata: Metadata = { title: 'Next Signal — local fixture', robots: { index: false, follow: false } };
/** 装配文档结构、全局样式和共享站点布局。 */
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>;
}
