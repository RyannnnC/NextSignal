import { Id } from '@nextsignal/contracts';
import { reportReturnPath } from './report-presentation';

/** 仅接受已知的站内认证回跳路径和契约规定的 UUID。 */
export function authReturn(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  if (value === '/validate' || value === '/account' || value === '/account/reports') return value;
  const project = /^\/validate\/([^/]+)\/(review|progress)$/.exec(value);
  if (project && Id.safeParse(project[1]).success) return value;
  return reportReturnPath(value) ?? '/account';
}
