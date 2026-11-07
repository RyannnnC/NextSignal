import type { Metadata } from 'next';
import './globals.css';
import { SiteShell } from './components/site-shell';

export const metadata: Metadata = { title: 'Next Signal — local fixture', robots: { index: false, follow: false } };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>;
}
