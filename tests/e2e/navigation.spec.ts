import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';

test.afterEach(async ({page}) => { await page.request.delete('/api/session',{headers:{origin:'http://127.0.0.1:3001'}}); });

test('marketing navigation, honest availability, brand and responsive bilingual routes', async ({page,context}) => {
  const external: string[] = [];
  await context.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(!['127.0.0.1','localhost'].includes(host)){external.push(host);return route.abort();}
    return route.continue();
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Know what to test next.');
  await expect(page).toHaveTitle('Know what to test next. | NextSignal');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Australian business idea/);
  expect((await page.request.get('/')).headers()['x-robots-tag']).toContain('noindex');
  expect(await page.locator('main').evaluate(main => main.getBoundingClientRect().width)).toBe(1440);
  await expect(page.locator('.site-header')).toHaveCSS('width', '1440px');
  await expect(page.locator('#pricing')).toHaveCSS('width', '1440px');
  expect(await page.getByLabel('Test business idea',{exact:true}).count()).toBe(0);
  const logo=page.getByRole('link', { name: 'NextSignal', exact: true });
  await expect(logo).toBeVisible();
  const icon=await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon).toBeTruthy(); expect((await page.request.get(icon!)).status()).toBe(200);
  await expect(page.locator('#pricing article')).toHaveCount(4);
  await expect(page.locator('#pricing article a').filter({ hasText: '↗' })).toHaveCount(0);
  await page.getByText('View planned services and proposed prices', { exact: true }).click();
  await expect(page.getByText('A$49',{exact:false})).toBeVisible();
  await expect(page.getByText('A$79',{exact:false})).toBeVisible();
  await expect(page.getByText('Planned — not available',{exact:true})).toHaveCount(3);
  await expect(page.getByRole('heading',{name:'Laptop repairs for students in Sydney',exact:true})).toBeVisible();
  await expect(page.locator('main > section').last()).toHaveAttribute('id', 'pricing');
  await page.getByRole('link', { name: 'See example report', exact: true }).click();
  await expect(page).toHaveURL(/\/example-report$/);
  await expect(page.getByRole('heading', { name: 'Published statistic' })).toBeVisible();
  await expect(page.getByText('8,305', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Simulated report output' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
  // Every homepage link is internal and has a real page or anchor target.
  const hrefs=await page.locator('a[href]').evaluateAll(links=>links.map(link=>link.getAttribute('href')!));
  for(const href of new Set(hrefs)){
    expect(href.startsWith('/' )||href.startsWith('#')).toBe(true);
    const url=new URL(href,'http://127.0.0.1:3001');
    expect((await page.request.get(url.pathname)).status()).toBe(200);
    if(url.hash)expect(await page.locator(url.hash).count()).toBe(1);
  }
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Grow My Business',exact:true}).click();
  await expect(page.getByText('There is no website crawler, SEO/GEO analysis or live growth report in this version. No URL is collected or fetched.')).toBeVisible();
  await expect(page.locator('main')).toHaveCSS('width', '1440px');
  expect(await page.locator('input[type=url]').count()).toBe(0);
  await page.getByRole('button',{name:'简体中文',exact:true}).click();
  await page.getByRole('main').getByRole('link',{name:'免费试用预览版',exact:true}).click();
  await expect(page.getByRole('button',{name:'创建项目并检查创意',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
  await page.getByRole('link',{name:'NextSignal',exact:true}).click();
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
  await expect(page.getByRole('heading',{level:1})).toHaveText('明确下一步， 先验证关键假设。');
  await page.reload();
  await page.setViewportSize({width:375,height:812});
  await expect(logo).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toHaveText('明确下一步， 先验证关键假设。');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  expect(external).toEqual([]);
});

test('private report deep links preserve authorization, login return, historical profile and deletion behavior',async ({page,browser})=>{
  const origin={origin:'http://127.0.0.1:3001'};
  await page.goto('/auth/sign-in?next=%2Fvalidate');
  await page.getByRole('button',{name:'Sign in locally',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create project and review idea',exact:true})).toBeVisible();
  const created=await page.request.post('/api/projects',{headers:origin,data:{idea:'Navigation test only: a synthetic reminder service for local tutors',geography:{country:'AU',granularity:'national'},processingConsent:true,noticeVersion:'local-fixture-v1',requestKey:randomUUID()}});
  expect(created.status()).toBe(201);
  const {id}=await created.json() as {id:string};
  const contexts=[];
  let ownerRequest=page.request;
  try {
    const draft=await (await page.request.get(`/api/projects/${id}`)).json();
    const profile=draft.profiles[0] as {id:string;content:Record<string,unknown>};
    const confirmed=await page.request.post(`/api/projects/${id}/confirm`,{headers:origin,data:{profileId:profile.id,profile:{...profile.content,customer:'Original private fixture customer'},requestKey:randomUUID()}});
    expect(confirmed.status()).toBe(200);
    const {id:profileId}=await confirmed.json() as {id:string};
    expect((await page.request.post(`/api/projects/${id}/runs`,{headers:origin,data:{profileId,requestKey:randomUUID()}})).status()).toBe(202);
    await expect.poll(async()=>((await (await page.request.get(`/api/projects/${id}`)).json()).reports as unknown[]).length).toBe(1);
    const saved=await (await page.request.get(`/api/projects/${id}`)).json();
    const reportId=saved.reports[0].id as string;
    const url=`/projects/${id}/reports/${reportId}`;
    await page.request.post(`/api/projects/${id}/confirm`,{headers:origin,data:{profileId,profile:{...profile.content,summary:'Updated project list title',customer:'New private fixture customer'},requestKey:randomUUID()}});
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/account/reports');
    await expect(page.getByRole('heading', { name: 'Updated project list title' })).toBeVisible();
    expect((await page.getByRole('region', { name: 'My reports' }).boundingBox())?.width).toBeGreaterThan(700);
    await page.goto(url); await page.reload();
    await expect(page.getByRole('region', { name: 'Business Overview' }).getByText('Original private fixture customer',{exact:true})).toBeVisible();
    expect(await page.getByText('New private fixture customer',{exact:true}).count()).toBe(0);
    expect((await page.request.get(url)).headers()['cache-control']).toContain('no-store');
    // End the first owner's session before testing an anonymous viewer and a new login.
    // Tests revoke their own credentials instead of consuming the bounded local session quota.
    await page.request.delete('/api/session',{headers:origin});
    await page.reload();
    await expect(page.getByRole('heading',{name:'Sign in to view this report',exact:true})).toBeVisible();
    const anon=await browser.newContext();contexts.push(anon);
    const anonPage=await anon.newPage();await anonPage.goto(`http://127.0.0.1:3001${url}`);
    await expect(anonPage.getByRole('heading',{name:'Sign in to view this report',exact:true})).toBeVisible();
    expect(await anonPage.getByText('Original private fixture customer',{exact:true}).count()).toBe(0);
    await anonPage.getByRole('link',{name:'Sign in locally',exact:true}).click();
    await anonPage.getByRole('button',{name:'Sign in locally',exact:true}).click();
    await expect(anonPage).toHaveURL(`http://127.0.0.1:3001${url}`);
    await expect(anonPage.getByRole('region', { name: 'Evidence at a glance' }).getByText('Original private fixture customer',{exact:true})).toBeVisible();
    ownerRequest=anon.request;
    const bob=await browser.newContext();contexts.push(bob);
    const bobPage=await bob.newPage();await bobPage.goto('http://127.0.0.1:3001/auth/sign-in?next=%2Fvalidate');
    await bobPage.getByLabel('Fixture account',{exact:true}).selectOption('bob');
    await bobPage.getByRole('button',{name:'Sign in locally',exact:true}).click();
    await expect(bobPage.getByRole('button',{name:'Create project and review idea',exact:true})).toBeVisible();
    await bobPage.goto(`http://127.0.0.1:3001${url}`);
    await expect(bobPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    expect(await bobPage.getByText('Original private fixture customer',{exact:true}).count()).toBe(0);
    await anonPage.goto(`http://127.0.0.1:3001/projects/${id}/reports/${randomUUID()}`);await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    await anonPage.goto('http://127.0.0.1:3001/projects/invalid/reports/invalid');await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    await ownerRequest.delete(`/api/projects/${id}`,{headers:origin});
    await anonPage.goto(`http://127.0.0.1:3001${url}`);await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
  } finally {
    await ownerRequest.delete(`/api/projects/${id}`,{headers:origin});
    for(const context of contexts){await context.request.delete('http://127.0.0.1:3001/api/session',{headers:origin});await context.close();}
  }
});
