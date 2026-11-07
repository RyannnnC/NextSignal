import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test.afterEach(async ({page}) => { await page.request.delete('/api/session',{headers:{origin:'http://127.0.0.1:3000'}}); });

test('bilingual design: local fonts, accessible flags, persistence, input preservation and responsive layout', async ({page,context})=>{
  const external:string[]=[];
  await context.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(!['127.0.0.1','localhost'].includes(host)){external.push(host);return route.abort();}
    return route.continue();
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Know your market.');
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.fonts.check('16px "DM Sans Variable"'))).toBe(true);
  expect(await page.evaluate(()=>Array.from(document.fonts).some(f=>f.family.includes('DM Sans Variable')&&f.status==='loaded'))).toBe(true);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/design-en-desktop.png',fullPage:false});
  await page.getByRole('button',{name:'简体中文',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
  await expect(page.getByRole('heading',{level:1})).toContainText('看清你的市场。');
  await expect(page.getByRole('button',{name:'简体中文',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await page.getByRole('navigation',{name:'主要导航'}).getByRole('link',{name:'验证我的创意',exact:true}).click();
  await expect(page.getByRole('button',{name:'登录本地账号',exact:true})).toBeVisible();
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({path:'artifacts/design-zh-desktop.png',fullPage:false});
  await page.getByRole('button',{name:'登录本地账号',exact:true}).click();
  await page.getByLabel('测试业务创意',{exact:true}).fill('一个帮助澳大利亚创始人核对业务假设的测试服务');
  await page.getByRole('checkbox',{name:'我已了解本地数据处理说明。',exact:true}).check();
  await page.getByRole('button',{name:'English (Australia)',exact:true}).click();
  await expect(page.getByLabel('Test business idea',{exact:true})).toHaveValue('一个帮助澳大利亚创始人核对业务假设的测试服务');
  await page.getByRole('button',{name:'简体中文',exact:true}).click();
  const created=page.waitForResponse(r=>r.url().endsWith('/api/projects')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'生成模拟资料',exact:true}).click();
  const id=(await (await created).json() as {id:string}).id;
  try {
    await page.getByLabel('目标客户 — 创始人陈述',{exact:true}).fill('澳大利亚的独立创业者');
    await page.getByRole('button',{name:'确认修正后的资料',exact:true}).click();
    await page.getByRole('button',{name:'生成模拟快照',exact:true}).click();
    await expect(page.getByRole('article',{name:'模拟报告 1',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'查看报告 1',exact:true}).click();
    await expect(page.getByRole('heading',{name:'客户需求和付费意愿仍然未知。',exact:true})).toBeVisible();
    const before=await (await page.request.get(`/api/projects/${id}`)).json() as {reports:unknown[]};
    await page.getByRole('button',{name:'English (Australia)',exact:true}).click();
    await expect(page.getByText('澳大利亚的独立创业者',{exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Customer demand and willingness to pay remain unknown.',exact:true})).toBeVisible();
    const after=await (await page.request.get(`/api/projects/${id}`)).json() as {reports:unknown[]};
    expect(after.reports).toEqual(before.reports);
    await page.getByRole('button',{name:'简体中文',exact:true}).click();
    await page.setViewportSize({width:375,height:812});
    await page.evaluate(()=>window.scrollTo(0,0));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'English (Australia)',exact:true})).toBeInViewport();
    await page.screenshot({path:'artifacts/design-zh-mobile.png',fullPage:false});
    await page.getByRole('article',{name:'模拟报告 1',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:'artifacts/design-zh-report-mobile.png',fullPage:false});
    const reportAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(reportAudit.violations).toEqual([]);
    await page.emulateMedia({reducedMotion:'reduce'});
    expect(await page.locator('.language-switch button').first().evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
    expect(external).toEqual([]);
  } finally {await page.request.delete(`/api/projects/${id}`,{headers:{origin:'http://127.0.0.1:3000'}});}
});
