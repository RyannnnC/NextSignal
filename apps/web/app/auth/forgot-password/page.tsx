import { PasswordForm } from '../../components/password-form';

/** 独立本地 Auth 模式的邮件恢复页面。 */
export default function Page() {
  if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local') return <p>Recovery is available in local Supabase mode.</p>;
  return <PasswordForm />;
}
