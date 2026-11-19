import { AuthForm } from '../../components/auth-form';
import { authReturn } from '../../../lib/auth-return';

/** 注册仅在独立本地 Auth 模式下启用。 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local') return <p>Registration is available in local Supabase mode.</p>;
  return <AuthForm signup returnTo={authReturn((await searchParams).next)} />;
}
