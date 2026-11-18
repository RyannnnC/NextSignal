import { Id } from '@nextsignal/contracts';
import { FixtureSignIn } from '../../components/account-pages';
import { reportReturnPath } from '../../../lib/report-presentation';

/** 仅接受已知路由和经过校验的项目 UUID。 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const match = typeof next === 'string' ? /^\/validate\/([^/]+)\/(review|progress)$/.exec(next) : null;
  const returnTo = reportReturnPath(next) ?? (match && Id.safeParse(match[1]).success ? next as string :
    next === '/validate' || next === '/account/reports' ? next : '/account');
  return <FixtureSignIn returnTo={returnTo} />;
}
