import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { origin, register } from './helpers';

/** 捕获桌面英文和移动中文布局，并检查外框与页面横向溢出。 */
async function capture(page: Page, name: string, mask: Locator[] = []) {
  for (const variant of [{ width: 1440, html: 'en' }, { width: 375, html: 'zh-CN' }]) {
    await page.setViewportSize({ width: variant.width, height: 960 });
    if (await page.locator('html').getAttribute('lang') !== variant.html) {
      await page.getByRole('button', { name: variant.html === 'en' ? '切换到英语（澳大利亚）' : 'Switch to Simplified Chinese', exact: true }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('lang', variant.html);
    await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; });
    await expect(page.locator('.site-header')).toHaveCSS('width', variant.width + 'px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(variant.width);
    await page.screenshot({ path: 'artifacts/remediation/design/' + name + '-' + variant.width + '.png', animations: 'disabled', fullPage: true, mask });
    if (name === 'private-report') {
      const height = variant.width === 1440 ? 900 : 844;
      await page.screenshot({ path: `artifacts/remediation/design/${name}-first-screen-${variant.width}.png`,
        animations: 'disabled', clip: { x: 0, y: 0, width: variant.width, height }, mask });
    }
  }
  await page.getByRole('button', { name: '切换到英语（澳大利亚）', exact: true }).click();
}

/** 核对菜单在断点两侧的可见性和键盘焦点。 */
async function checkMenu(page: Page) {
  await page.setViewportSize({ width: 1023, height: 960 });
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: 'Grow My Business', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 960 });
  await expect(menu).toBeHidden();
  await expect(navigation).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  const rows = await navigation.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().top));
  expect(new Set(rows).size).toBe(1);
  const bounds = await navigation.boundingBox();
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(512, 0);
}

test('real local account and report layouts @design', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await checkMenu(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test your idea. Start with evidence.');
  await page.setViewportSize({ width: 1920, height: 960 });
  const logo = await page.getByRole('link', { name: 'NextSignal', exact: true }).boundingBox();
  const headline = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(logo!.x).toBeCloseTo(headline!.x, 0);
  const nav = await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox();
  expect(nav!.x + nav!.width / 2).toBeCloseTo(960, 0);
  await expect(page.getByRole('link', { name: 'See example report', exact: true })).toHaveAttribute('href', '/example-report');
  await capture(page, 'home');
  await page.goto('/example-report');
  await capture(page, 'example-report');
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await page.goto('/validate');
  await expect(page.getByLabel('Test business idea')).toBeVisible();
  expect(await page.getByRole('heading', { name: 'Validate My Idea', exact: true }).evaluate(heading =>
    heading.getBoundingClientRect().height <= parseFloat(getComputedStyle(heading).lineHeight) + 1
  )).toBe(true);
  await capture(page, 'validate');

  for (const [route, title] of [
    ['sign-in', 'Sign In'], ['sign-up', 'Create your account'],
    ['forgot-password', 'Reset password'], ['reset-password', 'Set a new password'],
  ] as const) {
    await page.goto('/auth/' + route);
    await expect(page).toHaveTitle(new RegExp(title, 'i'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await capture(page, route);
  }
  const email = 'design-' + randomBytes(8).toString('hex') + '@example.test';
  await register(page, email, randomBytes(24).toString('base64url'));
  await capture(page, 'account', [page.getByText(email, { exact: true })]);
  await page.goto('/account/reports');
  await expect(page.getByText('No projects yet.')).toBeVisible();
  await capture(page, 'empty-reports');

  await page.goto('/validate');
  await page.getByText('Use an example', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Sydney repair example' }).click();
  await page.getByRole('checkbox', { name: /I understand/ }).check();
  const creation = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create project and review idea' }).click();
  const response = await creation;
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  try {
    await expect(page.getByRole('heading', { name: 'Review business profile' })).toBeVisible();
    await capture(page, 'review');
    await page.getByRole('button', { name: 'Confirm corrected profile' }).click();
    await page.getByRole('button', { name: 'Generate preview report' }).click();
    const current = page.getByRole('link', { name: 'Open current report' });
    await expect(current).toBeVisible({ timeout: 20_000 });
    await page.setViewportSize({ width: 1440, height: 960 });
    expect((await page.getByRole('region', { name: 'Research runs' }).boundingBox())?.width).toBeGreaterThan(700);
    await capture(page, 'progress');
    await page.setViewportSize({ width: 1440, height: 960 });
    await current.click();
    await expect(page.getByRole('heading', { name: 'Business Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evidence at a glance' })).toBeVisible();
    const firstExperiment = page.getByRole('link', { name: 'First experiment', exact: true });
    const experimentTarget = await firstExperiment.getAttribute('href');
    expect(experimentTarget).toMatch(/^#action-/);
    await firstExperiment.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(experimentTarget!)).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Report navigation' }).getByRole('link', { name: 'Validation plan' }))
      .toHaveAttribute('aria-current', 'location');
    const evidence = page.getByRole('heading', { name: 'Evidence at a glance' });
    const founderStatement = page.getByRole('region', { name: 'Evidence at a glance' }).locator('summary').filter({ hasText: 'Founder statement' });
    await founderStatement.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'View saved business profile' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'View saved business profile' })).toBeHidden();
    await expect(evidence).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('navigation', { name: 'Report navigation' }).getByRole('link', { name: 'Summary' }))
      .toHaveAttribute('aria-current', 'location');
    await capture(page, 'private-report');
    const reportMenu = page.getByText('Jump to a section', { exact: true });
    await reportMenu.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Report navigation' })).toBeVisible();
    await page.getByRole('link', { name: 'Evidence and gaps', exact: true }).click();
    await expect(page.locator('#report-evidence')).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Report navigation' })).toBeHidden();
    await page.goto('/account/reports');
    const list = page.getByRole('region', { name: 'My reports' });
    await expect(list.getByRole('link', { name: 'View report 1' })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 960 });
    expect((await list.boundingBox())?.width).toBeGreaterThan(700);
    await capture(page, 'reports');
  } finally {
    await page.request.delete('/api/projects/' + id, { headers: origin });
  }
});
