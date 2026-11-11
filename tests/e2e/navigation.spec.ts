import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

test.afterEach(async ({page}) => { await page.request.delete('/api/session',{headers:{origin:'http://127.0.0.1:3000'}}); });

test('marketing navigation, honest availability, original brand assets and responsive bilingual routes', async ({page,context}) => {
  const external: string[] = [];
  await context.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(!['127.0.0.1','localhost'].includes(host)){external.push(host);return route.abort();}
    return route.continue();
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Know your market.');
  expect(await page.getByLabel('Test business idea',{exact:true}).count()).toBe(0);
  const logo=page.locator('.hero img');
  await expect(logo).toHaveAttribute('alt','NextSignal');
  expect(await logo.evaluate((image: HTMLImageElement)=>Number(image.getAttribute('width'))/Number(image.getAttribute('height')))).toBe(3);
  expect(await logo.evaluate(image=>image.getBoundingClientRect().width/image.getBoundingClientRect().height)).toBeCloseTo(3,2);
  const icon=await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon).toBeTruthy(); expect((await page.request.get(icon!)).status()).toBe(200);
  await expect(page.locator('#pricing article')).toHaveCount(4);
  await expect(page.getByText('A$49',{exact:false})).toBeVisible();
  await expect(page.getByText('A$79',{exact:false})).toBeVisible();
  await expect(page.getByText('Planned — not available',{exact:true})).toHaveCount(3);
  await expect(page.getByRole('heading',{name:'Research & Case Studies',exact:true})).toBeVisible();
  // Every homepage link is internal and has a real page or anchor target.
  const hrefs=await page.locator('a[href]').evaluateAll(links=>links.map(link=>link.getAttribute('href')!));
  for(const href of new Set(hrefs)){
    expect(href.startsWith('/' )||href.startsWith('#')).toBe(true);
    const url=new URL(href,'http://127.0.0.1:3000');
    expect((await page.request.get(url.pathname)).status()).toBe(200);
    if(url.hash)expect(await page.locator(url.hash).count()).toBe(1);
  }
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/phase2-home-desktop.png',fullPage:true});
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Grow My Business',exact:true}).click();
  await expect(page.getByText('There is no website crawler, SEO/GEO analysis or live growth report in this version. No URL is collected or fetched.')).toBeVisible();
  expect(await page.locator('input[type=url]').count()).toBe(0);
  await page.getByRole('button',{name:'简体中文',exact:true}).click();
  await page.getByRole('link',{name:'体验本地创意模拟流程',exact:true}).click();
  await expect(page.getByRole('button',{name:'登录本地账号',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
  await page.getByRole('link',{name:'NextSignal',exact:true}).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page.getByRole('heading',{level:1})).toContainText('看清你的市场。');
  await page.reload();
  await page.setViewportSize({width:375,height:812});
  await expect(page.locator('.hero img')).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toContainText('看清你的市场。');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/phase2-home-mobile.png',fullPage:true});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  expect(external).toEqual([]);
});

test('private report deep links preserve authorization, login return, historical profile and deletion behavior',async ({page,browser})=>{
  const origin={origin:'http://127.0.0.1:3000'};
  await page.goto('/validate');
  await page.getByRole('button',{name:'Sign in locally',exact:true}).click();
  await expect(page.getByRole('button',{name:'Prepare fixture profile',exact:true})).toBeVisible();
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
    await page.request.post(`/api/projects/${id}/confirm`,{headers:origin,data:{profileId,profile:{...profile.content,customer:'New private fixture customer'},requestKey:randomUUID()}});
    await page.goto(url); await page.reload();
    await expect(page.getByText('Original private fixture customer',{exact:true})).toBeVisible();
    expect(await page.getByText('New private fixture customer',{exact:true}).count()).toBe(0);
    expect((await page.request.get(url)).headers()['cache-control']).toContain('no-store');
    // End the first owner's session before testing an anonymous viewer and a new login.
    // Tests revoke their own credentials instead of consuming the bounded local session quota.
    await page.request.delete('/api/session',{headers:origin});
    await page.reload();
    await expect(page.getByRole('heading',{name:'Sign in to view this report',exact:true})).toBeVisible();
    const anon=await browser.newContext();contexts.push(anon);
    const anonPage=await anon.newPage();await anonPage.goto(`http://127.0.0.1:3000${url}`);
    await expect(anonPage.getByRole('heading',{name:'Sign in to view this report',exact:true})).toBeVisible();
    expect(await anonPage.getByText('Original private fixture customer',{exact:true}).count()).toBe(0);
    await anonPage.getByRole('link',{name:'Sign in locally',exact:true}).click();
    await anonPage.getByRole('button',{name:'Sign in locally',exact:true}).click();
    await expect(anonPage).toHaveURL(`http://127.0.0.1:3000${url}`);
    await expect(anonPage.getByText('Original private fixture customer',{exact:true})).toBeVisible();
    ownerRequest=anon.request;
    const bob=await browser.newContext();contexts.push(bob);
    const bobPage=await bob.newPage();await bobPage.goto('http://127.0.0.1:3000/validate');
    await bobPage.getByLabel('Fixture account',{exact:true}).selectOption('bob');
    await bobPage.getByRole('button',{name:'Sign in locally',exact:true}).click();
    await expect(bobPage.getByRole('button',{name:'Prepare fixture profile',exact:true})).toBeVisible();
    await bobPage.goto(`http://127.0.0.1:3000${url}`);
    await expect(bobPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    expect(await bobPage.getByText('Original private fixture customer',{exact:true}).count()).toBe(0);
    await anonPage.goto(`http://127.0.0.1:3000/projects/${id}/reports/${randomUUID()}`);await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    await anonPage.goto('http://127.0.0.1:3000/projects/invalid/reports/invalid');await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
    await ownerRequest.delete(`/api/projects/${id}`,{headers:origin});
    await anonPage.goto(`http://127.0.0.1:3000${url}`);await expect(anonPage.locator('main [role="alert"]')).toContainText('Report unavailable.');
  } finally {
    await ownerRequest.delete(`/api/projects/${id}`,{headers:origin});
    for(const context of contexts){await context.request.delete('http://127.0.0.1:3000/api/session',{headers:origin});await context.close();}
  }
});
