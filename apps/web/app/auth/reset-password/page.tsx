import { PasswordForm } from '../../components/password-form';

/** 更新密码必须由服务端认证入口重新核验会话。 */
export default function Page() {
  if (process.env.NEXTSIGNAL_AUTH_MODE !== 'supabase-local') return <p>Recovery is available in local Supabase mode.</p>;
  return <PasswordForm reset />;
}
