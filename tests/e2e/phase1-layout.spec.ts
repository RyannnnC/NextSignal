import { expect, test, type Locator, type Page } from '@playwright/test';

const widths = [375, 768, 1024, 1440, 1920];
const origin = { origin: 'http://127.0.0.1:3001' };

/** 核对各断点的布局，并输出可复审的浏览器截图。 */
async function capture(page: Page, name: string, mask: Locator[] = []) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; });
    await expect(page.locator('.site-header')).toHaveCSS('width', `${Math.min(1440, width)}px`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width >= 1024) {
      const rows = await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link').evaluateAll(
        links => links.map(link => link.getBoundingClientRect().top)
      );
      expect(new Set(rows).size).toBe(1);
    }
    await page.screenshot({ path: `artifacts/phase1/${name}-${width}.png`, animations: 'disabled', fullPage: width === 1440, mask });
  }
}

test('phase 1 layout and opted-in draft through the separated private flow', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await capture(page, 'home');
  await page.goto('/grow');
  await capture(page, 'grow');
  await page.goto('/validate');
  const idea = page.getByLabel('Test business idea');
  await expect(idea).toBeVisible();
  await expect(page.getByLabel('Fixture account')).toHaveCount(0);
  await expect(page.getByLabel('Development fixture scenario')).toHaveCount(0);
  await capture(page, 'validate');
  await page.setViewportSize({ width: 375, height: 960 });
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Grow My Business' }).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Load three-area comparison example' }).click();
  const draft = await idea.inputValue();
  await page.getByRole('checkbox', { name: /I understand/ }).check();
  await page.getByRole('checkbox', { name: /Keep this draft/ }).check();
  await page.getByRole('button', { name: 'Prepare fixture profile' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?/);
  await capture(page, 'sign-in');
  await page.getByRole('button', { name: 'Sign in locally' }).click();
  await expect(idea).toHaveValue(draft);
  await expect(page.getByRole('checkbox', { name: /I understand/ })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /I understand/ }).check();
  const created = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Prepare fixture profile' }).click();
  const { id } = await (await created).json() as { id: string };
  try {
    await expect(page.getByRole('heading', { name: 'Review business profile' })).toBeVisible();
    await expect(page.getByLabel('Intended customer — founder statement')).toHaveValue('Students and young professionals');
    await capture(page, 'review');
    await page.getByRole('button', { name: 'Confirm corrected profile' }).click();
    await page.getByRole('button', { name: 'Run fixture snapshot' }).click();
    const report = page.getByRole('link', { name: 'Open current report' });
    await expect(report).toBeVisible({ timeout: 20_000 });
    await capture(page, 'progress');
    await report.click();
    await expect(page.getByRole('heading', { name: 'Local Opportunity Brief' })).toBeVisible({ timeout: 20_000 });
    await capture(page, 'report');
    await page.goto('/account');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await capture(page, 'account');
    await page.getByRole('main').getByRole('link', { name: 'My reports' }).click();
    await expect(page.locator('.history-row').filter({ has: page.locator(`a[href^="/projects/${id}/"]`) })).toBeVisible();
    await capture(page, 'my-reports', [page.locator('.history-row').filter({ hasNot: page.locator(`a[href^="/projects/${id}/"]`) })]);
  } finally {
    await page.request.delete(`/api/projects/${id}`, { headers: origin });
    await page.request.delete('/api/session', { headers: origin });
  }
});
