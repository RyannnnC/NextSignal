import { ApiError } from '@nextsignal/contracts';

type AuthAction =
  | { action: 'sign-in' | 'sign-up'; email: FormDataEntryValue | null; password: FormDataEntryValue | null; next: string }
  | { action: 'forgot-password'; email: FormDataEntryValue | null }
  | { action: 'reset-password'; password: FormDataEntryValue | null }
  | { action: 'sign-out' };

/** 通过同源认证入口提交操作，交由各页面处理结果。 */
export async function requestAuth(action: AuthAction) {
  const response = await fetch('/auth/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action), cache: 'no-store' });
  return response.ok;
}

export class ClientApiError extends Error {
  /** 保存 HTTP 状态与业务错误码，供界面区分失败原因。 */
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
/** 发起同源 API 请求，并将错误响应解析为类型化异常。 */
export async function api(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = ApiError.parse(data);
    throw new ClientApiError(response.status, error.code, error.error);
  }
  return data;
}
