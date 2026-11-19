import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { beginSignup, origin, register, verificationLink } from './helpers';

test('real local signup, email verification, session, owner isolation, research and logout', async ({ page, browser }) => {
  const suffix = randomBytes(8).toString('hex');
  const email = `owner-${suffix}@example.test`, password = randomBytes(24).toString('base64url');
  expect(await (await page.request.get('/api/health')).json()).toMatchObject({ mode: 'local-supabase' });
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
  const sessionCookies = (await page.context().cookies()).filter(cookie => /^nextsignal-auth(?:\.\d+)?$/.test(cookie.name));
  expect(sessionCookies.length).toBeGreaterThan(0);
  for (const cookie of sessionCookies) expect(cookie.httpOnly).toBe(true);
  await page.goto('/auth/sign-in?next=https%3A%2F%2Fevil.example');
  await expect(page.getByLabel('Fixture account')).toHaveCount(0);
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
    const initialCustomer = 'Original synthetic report customer';
    const confirmed = await page.request.post(`/api/projects/${id}/confirm`, { headers: origin, data: { profileId: profile.id, profile: { ...profile.content, customer: initialCustomer }, requestKey: crypto.randomUUID() } });
    expect(confirmed.status()).toBe(200);
    const { id: firstProfile } = await confirmed.json();
    expect((await page.request.post(`/api/projects/${id}/runs`, { headers: origin, data: { profileId: firstProfile, requestKey: crypto.randomUUID() } })).status()).toBe(202);
    await expect.poll(async () => (await (await page.request.get(`/api/projects/${id}`)).json()).reports.length).toBe(1);
    const report = (await (await page.request.get(`/api/projects/${id}`)).json()).reports[0];
    const revised = await page.request.post(`/api/projects/${id}/confirm`, { headers: origin, data: {
      profileId: firstProfile, profile: { ...profile.content, summary: 'Revised synthetic project title', customer: 'Revised synthetic report customer' }, requestKey: crypto.randomUUID(),
    } });
    expect(revised.status()).toBe(200);
    expect((await page.request.post(`/api/projects/${id}/runs`, { headers: origin, data: { profileId: (await revised.json()).id, requestKey: crypto.randomUUID() } })).status()).toBe(202);
    await expect.poll(async () => (await (await page.request.get(`/api/projects/${id}`)).json()).reports.length).toBe(2);
    await page.goto('/account/reports');
    const history = page.locator('.history-row').filter({ hasText: 'Revised synthetic project title' });
    await expect(history.getByRole('link', { name: /View report/ })).toHaveCount(2);
    await history.getByRole('link', { name: 'View report 2' }).click();
    await expect(page.getByText('Revised synthetic report customer', { exact: true })).toBeVisible();
    await page.goto(`/projects/${id}/reports/${report.id}`);
    await expect(page.getByRole('heading', { name: report.title, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: report.title, exact: true })).toBeVisible();
    await expect(page.getByText(initialCustomer, { exact: true })).toBeVisible();
    await expect(page.getByText('Revised synthetic report customer', { exact: true })).toHaveCount(0);
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
  const signedInCookies = (await page.context().cookies()).filter(cookie => /^nextsignal-auth(?:\.\d+)?$/.test(cookie.name));
  expect(signedInCookies.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const expiredContext = await browser.newContext();
  try {
    await expiredContext.addCookies(signedInCookies);
    expect((await expiredContext.request.get('http://127.0.0.1:3000/api/projects')).status()).toBe(401);
  } finally { await expiredContext.close(); }
  await page.goto('/auth/callback?code=invalid');
  await expect(page).toHaveURL(/\/auth\/sign-in\?error=verification$/);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or expired');
  expect((await page.request.post('/auth/action', { data: { action: 'sign-in', email, password } })).status()).toBe(403);
});

test('opted-in draft survives reload and verification in another tab, then clears', async ({ page, context }) => {
  const email = `draft-${randomBytes(8).toString('hex')}@example.test`;
  const idea = 'Synthetic idea for testing a local repair service draft';
  const field = page.getByLabel('Test business idea', { exact: true });
  await page.goto('/validate');
  await expect(page.getByText('Sign in to save your idea as a private project.')).toBeVisible();
  await field.fill(idea);
  await page.reload();
  await expect(field).toHaveValue('');
  await field.fill(idea);
  await page.getByRole('checkbox', { name: /Keep this draft/ }).check();
  await page.reload();
  await expect(field).toHaveValue(idea);
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await page.reload();
  await expect(field).toHaveValue('');
  await field.fill(idea);
  await page.getByRole('checkbox', { name: /Keep this draft/ }).check();
  await page.evaluate(() => {
    const key = 'nextsignal-fixture-draft';
    sessionStorage.setItem(key, JSON.stringify({ ...JSON.parse(sessionStorage.getItem(key)!), expires: Date.now() - 1 }));
  });
  await page.reload();
  await expect(field).toHaveValue('');

  await field.fill(idea);
  await page.getByRole('checkbox', { name: /I understand/ }).check();
  await page.getByRole('checkbox', { name: /Record optional marketing/ }).check();
  await page.getByRole('checkbox', { name: /Keep this draft/ }).check();
  await page.getByRole('button', { name: 'Create project and review idea' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fvalidate$/);
  await beginSignup(page, email, randomBytes(24).toString('base64url'), '/validate');
  const verification = await context.newPage();
  try {
    await verification.goto(await verificationLink(email));
    await expect(verification).toHaveURL(/\/validate$/);
    await expect(verification.getByLabel('Test business idea')).toHaveValue('');
  } finally { await verification.close(); }
  await page.getByRole('link', { name: 'Continue to your idea' }).click();
  await expect(page).toHaveURL(/\/validate$/);
  await expect(field).toHaveValue(idea);
  await page.reload();
  await expect(field).toHaveValue(idea);
  await expect(page.getByRole('checkbox', { name: /I understand/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Record optional marketing/ })).toBeChecked();
  const creation = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create project and review idea' }).click();
  const response = await creation;
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  try {
    await expect(page).toHaveURL(new RegExp('/validate/' + id + '/review$'));
    expect(await page.evaluate(() => sessionStorage.getItem('nextsignal-fixture-draft'))).toBeNull();
  } finally { await page.request.delete(`/api/projects/${id}`, { headers: origin }); }
});
