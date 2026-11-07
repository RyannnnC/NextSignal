import { ApiError } from '@kyb/contracts';

export class ClientApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
export async function api(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = ApiError.parse(data);
    throw new ClientApiError(response.status, error.code, error.error);
  }
  return data;
}
