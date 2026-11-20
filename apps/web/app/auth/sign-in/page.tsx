import { notFound } from 'next/navigation';
import { FixtureSignIn } from '../../components/account-pages';
import { authReturn } from '../../../lib/auth-return';
import { AuthForm } from '../../components/auth-form';

export const metadata = { title: 'Sign in' };

/** 仅接受已知路由和经过校验的项目 UUID。 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const { next, error } = await searchParams;
  const returnTo = authReturn(next);
  if (process.env.NEXTSIGNAL_AUTH_MODE === 'supabase-local') return <AuthForm returnTo={returnTo} verificationError={error === 'verification'} />;
  if (process.env.NEXTSIGNAL_LOCAL_FIXTURE === '1' && process.env.NODE_ENV !== 'production') return <FixtureSignIn returnTo={returnTo} />;
  notFound();
}
