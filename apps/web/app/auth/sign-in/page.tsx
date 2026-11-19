import { Id } from '@nextsignal/contracts';
import { FixtureSignIn } from '../../components/account-pages';
import { reportReturnPath } from '../../../lib/report-presentation';
import { AuthForm } from '../../components/auth-form';

/** 仅接受已知路由和经过校验的项目 UUID。 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const { next, error } = await searchParams;
  const match = typeof next === 'string' ? /^\/validate\/([^/]+)\/(review|progress)$/.exec(next) : null;
  const returnTo = reportReturnPath(next) ?? (match && Id.safeParse(match[1]).success ? next as string :
    next === '/validate' || next === '/account/reports' ? next : '/account');
  return process.env.NEXTSIGNAL_AUTH_MODE === 'supabase-local' ? <AuthForm returnTo={returnTo} verificationError={error === 'verification'} /> : <FixtureSignIn returnTo={returnTo} />;
}
