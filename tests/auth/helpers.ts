import { expect, type Page } from '@playwright/test';
import { Client } from 'pg';

export const origin = { origin: 'http://127.0.0.1:3000' };

/** 只从指定测试邮箱的 Mailpit 邮件提取验证链接，不保存含凭据的 trace。 */
export async function verificationLink(email: string) {
  let id = '';
  await expect.poll(async () => {
    const messages = await (await fetch('http://127.0.0.1:55424/api/v1/messages')).json();
    const match = messages.messages.find((item: { To: { Address: string }[] }) => item.To.some(to => to.Address === email));
    id = match?.ID ?? '';
    return Boolean(id);
  }, { timeout: 20_000 }).toBe(true);
  const message = await (await fetch(`http://127.0.0.1:55424/api/v1/message/${id}`)).json();
  const href = /href="([^"]+)"/.exec(message.HTML)?.[1]?.replaceAll('&amp;', '&');
  if (!href || new URL(href).origin !== 'http://127.0.0.1:55421') throw new Error('Unexpected email verification origin');
  return href;
}

/** 从页面注册真实账号并通过本地收件箱验证。 */
export async function beginSignup(page: Page, email: string, password: string, next = '') {
  await page.goto(next ? '/auth/sign-up?next=' + encodeURIComponent(next) : '/auth/sign-up');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
}

/** 完成注册并确认未验证用户仍无法访问项目。 */
export async function register(page: Page, email: string, password: string) {
  await beginSignup(page, email, password);
  const sql = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55422/postgres' });
  await sql.connect();
  try {
    expect((await sql.query('select email_confirmed_at from auth.users where email=$1', [email])).rows[0]?.email_confirmed_at).toBeNull();
  } finally { await sql.end(); }
  expect((await page.request.get('/api/projects')).status()).toBe(401);
  expect((await page.request.post('/auth/action', { headers: origin, data: { action: 'sign-in', email, password } })).status()).toBe(400);
  await page.goto(await verificationLink(email));
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText('Email verified', { exact: true })).toBeVisible();
}
