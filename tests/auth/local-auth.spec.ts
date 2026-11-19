import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const origin = { origin: 'http://127.0.0.1:3000' };

/** 只从指定测试邮箱的 Mailpit 邮件提取验证链接，不保存含凭据的 trace。 */
async function verificationLink(email: string) {
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
async function register(page: Page, email: string, password: string) {
  await page.goto('/auth/sign-up');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
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

test('real local signup, email verification, session, owner isolation, research and logout', async ({ page, browser }) => {
  const suffix = randomBytes(8).toString('hex');
  const email = `owner-${suffix}@example.test`, password = randomBytes(24).toString('base64url');
  await register(page, email, password);
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const config = JSON.parse(await readFile('.local/auth-local.json', 'utf8'));
  const publicClient = createClient(config.url, config.key, { auth: { persistSession: false } });
  const revokedSession = await publicClient.auth.signInWithPassword({ email, password });
  if (!revokedSession.data.session) throw new Error('Expected a test session');
  await publicClient.auth.signOut();
  const { openAuthRuntime } = await import('@nextsignal/adapters/auth-local');
  const runtime = openAuthRuntime(config);
  try { expect(await runtime.sessions.resolve(revokedSession.data.session.access_token)).toBeNull(); }
  finally { await runtime.close(); }
  const rawCookies = await page.context().cookies();
  expect(rawCookies.filter(cookie => cookie.name.startsWith('nextsignal-auth')).every(cookie => cookie.httpOnly)).toBe(true);
  await page.goto('/auth/sign-in?next=https%3A%2F%2Fevil.example');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/account');
  const created = await page.request.post('/api/projects', { headers: origin, data: {
    idea: 'Auth verification case for a small Australian computer repair service',
    geography: { country: 'AU', granularity: 'national' }, processingConsent: true,
    noticeVersion: 'local-fixture-v1', requestKey: crypto.randomUUID(),
  } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  try {
    const saved = await (await page.request.get(`/api/projects/${id}`)).json();
    const profile = saved.profiles[0];
    const confirmed = await page.request.post(`/api/projects/${id}/confirm`, { headers: origin, data: { profileId: profile.id, profile: profile.content, requestKey: crypto.randomUUID() } });
    expect(confirmed.status()).toBe(200);
    expect((await page.request.post(`/api/projects/${id}/runs`, { headers: origin, data: { profileId: (await confirmed.json()).id, requestKey: crypto.randomUUID() } })).status()).toBe(202);
    await expect.poll(async () => (await (await page.request.get(`/api/projects/${id}`)).json()).reports.length).toBe(1);
    const report = (await (await page.request.get(`/api/projects/${id}`)).json()).reports[0];
    await page.goto(`/projects/${id}/reports/${report.id}`);
    await expect(page.getByRole('heading', { name: report.title, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: report.title, exact: true })).toBeVisible();
    const other = await browser.newContext();
    const second = await other.newPage();
    try {
      await register(second, `other-${suffix}@example.test`, password);
      expect((await second.request.get(`/api/projects/${id}`)).status()).toBe(404);
      expect((await second.request.post(`/api/projects/${id}/runs`, { headers: origin, data: { profileId: profile.id, requestKey: crypto.randomUUID() } })).status()).toBe(404);
      await second.goto(`/projects/${id}/reports/${report.id}`);
      await expect(second.locator('main [role="alert"]')).toContainText('Report unavailable');
      await second.goto('/account');
      await second.getByRole('button', { name: 'Sign out', exact: true }).click();
    } finally { await other.close(); }
    expect((await page.request.post('/api/projects', { headers: origin, data: { workspaceId: crypto.randomUUID() } })).status()).toBe(400);
  } finally { await page.request.delete(`/api/projects/${id}`, { headers: origin }); }
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  expect((await page.request.get('/api/projects')).status()).toBe(401);
  const nextPassword = randomBytes(24).toString('base64url');
  await page.goto('/auth/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('check your email');
  await page.goto(await verificationLink(email));
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const signedInCookies = await page.context().cookies();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const expiredContext = await browser.newContext();
  try {
    await expiredContext.addCookies(signedInCookies);
    expect((await expiredContext.request.get('http://127.0.0.1:3000/api/projects')).status()).toBe(401);
  } finally { await expiredContext.close(); }
  await page.goto('/auth/callback?code=invalid');
  await expect(page).toHaveURL(/\/auth\/sign-in\?error=verification$/);
  await expect(page.getByRole('alert')).toContainText('invalid or expired');
  expect((await page.request.post('/auth/action', { data: { action: 'sign-in', email, password } })).status()).toBe(403);
});
