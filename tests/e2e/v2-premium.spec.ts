import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { newToken, digestToken } from '../../apps/web/server/security.js';
const file = (name: string) => pathToFileURL(resolve(`apps/web/pages/${name}.html`)).href;
const db = new PrismaClient(); test.afterAll(() => db.$disconnect());
test('verified clients see disconnected Tools without synthetic data or actionable trades', async ({page,context}, info) => {
  const prefix = `client-tools-${info.project.name}-${Date.now()}`;
  const admin = await db.user.create({data:{name:'Synthetic reviewer',email:prefix+'-admin@example.test',role:'ADMIN',passwordHash:'no-login'}});
  const user = await db.user.create({data:{name:'Synthetic client',email:prefix+'@example.test',passwordHash:'no-login',membership:{create:{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:admin.id,verifiedAt:new Date()}}}});
  try {
    const token = newToken(); await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});
    await context.addCookies([{name:'__Host-yengfx_session',value:token,domain:'127.0.0.1',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
    await page.goto('/app/mt5');
    await expect(page.locator('body')).toHaveAttribute('data-client-view','true');
    await expect(page.getByRole('heading',{name:'Coming soon',exact:true})).toBeVisible();
    await expect(page.locator('[data-v2-trade]')).toHaveCount(0);
    await expect(page.locator('.demo-badge')).not.toContainText('DEMO');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`docs/screenshots/${info.project.name}-client-tools-disconnected.png`,fullPage:true});
    await page.goto('/app/signals'); await expect(page.locator('[data-v2-signal-demo]')).toHaveCount(0);
    await page.goto('/app/chat'); await expect(page.locator('[data-v2-chat]')).toHaveCount(0);
  } finally { await db.user.deleteMany({where:{id:{in:[user.id,admin.id]}}}); }
});
test('Beta 1 Tools preview has no simulations or command requests', async ({page})=>{
  const calls:string[]=[];page.on('request',request=>{if(request.url().includes('/api/'))calls.push(request.url());});
  await page.goto(file('member/mt5'));
  await expect(page.getByRole('heading',{name:'Coming soon',exact:true})).toBeVisible();
  await expect(page.locator('[data-v2-trade]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Preview TP|Preview SL|Close All/})).toHaveCount(0);
  expect(calls).toEqual([]);
});

test('V2 local chat, research, favorites and learning progress work without a backend', async ({ page }) => {
  await page.goto(file('member/chat'));
  await page.getByLabel('Demo message').fill('<img src=x onerror=alert(1)> Local test');
  await page.getByRole('button',{ name:'Send locally',exact:true }).click();
  await expect(page.locator('.v2-chat-log')).toContainText('<img src=x onerror=alert(1)> Local test');
  await expect(page.locator('.v2-chat-log img')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.v2-chat-log')).toContainText('Local test');
  await page.getByRole('button',{ name:/EA Technical Support/ }).click();
  await expect(page.locator('.v2-chat-log')).not.toContainText('Local test');
  await page.goto(file('member/strategy'));
  await page.getByLabel('Strategy name').fill('Synthetic research draft');
  await page.getByLabel('Entry rules & confluence').fill('Synthetic confirmed body zone and structure rules.');
  await page.getByRole('button',{ name:'Save local research draft' }).click();
  await expect(page.locator('[data-v2-local-form] [role=status]')).toContainText('saved in this browser only');
  await page.reload(); await expect(page.getByLabel('Strategy name')).toHaveValue('Synthetic research draft');
  await page.goto(file('member/academy'));
  await page.getByRole('button',{ name:'Mark demo complete: SNR / SBR / RBS',exact:true }).click();
  await expect(page.locator('[data-v2-courses]')).toContainText('1 / 3');
  await page.goto(file('member/signals'));
  await page.locator('[data-v2-signal-demo] summary').first().click();
  await page.getByRole('button',{ name:'Save demo analysis',exact:true }).first().click();
  await page.locator('[data-demo-filter="SAVED"]').click();
  await expect(page.locator('[data-v2-signal-demo] article')).toHaveCount(1);
  await page.goto(file('member/community'));
  const social = page.locator('[data-v2-social]');
  await social.locator('summary').click();
  await social.getByLabel('Local demo post').fill('Synthetic local post');
  await social.getByRole('button',{name:'Create demo post',exact:true}).click();
  await expect(social.locator('details')).toHaveAttribute('open','');
  await social.getByRole('button',{name:'Like (0)',exact:true}).click();
  await expect(social.getByRole('button',{name:'Like (1)',exact:true})).toBeVisible();
});
test('all V2 HTML screens render offline and real routes retain role protection', async ({ page, context }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const name of (await readdir('apps/web/pages',{recursive:true})).filter(v => v.endsWith('.html'))) {
    await page.goto(pathToFileURL(resolve('apps/web/pages',name)).href);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),name).toBe(true);
  }
  const prefix = `v2-browser-${info.project.name}-${Date.now()}`;
  const user = await db.user.create({ data:{ name:'V2 synthetic member',email:prefix+'@example.test',passwordHash:'synthetic-not-a-login',role:'MEMBER' } });
  try {
    const token = newToken(); await db.session.create({ data:{ userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000) } });
    await context.addCookies([{ name:'__Host-yengfx_session',value:token,domain:'127.0.0.1',path:'/',secure:true,httpOnly:true,sameSite:'Lax' }]);
    await page.goto('/app/chat'); await expect(page).toHaveURL(/membership/);
    await page.goto('/admin'); await expect(page).not.toHaveURL(/\/admin$/);
    await db.user.update({ where:{id:user.id},data:{role:'ADMIN'} });
    for (const route of ['/app','/app/mt5','/app/chat','/app/strategy','/app/backtesting','/admin','/admin/members','/admin/signals','/admin/mapping','/admin/content']) {
      const response = await page.goto(route); expect(response?.status(),route).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),route).toBe(true);
    }
    await page.goto('/admin'); await page.screenshot({ path:`docs/screenshots/${info.project.name}-v2-admin.png`,fullPage:true });
    await page.goto('/app'); await page.screenshot({ path:`docs/screenshots/${info.project.name}-v2-dashboard.png`,fullPage:true });
    await page.getByRole('link',{name:/Open P\/L Calendar/}).click();
    await expect(page.locator('[data-dashboard]')).toBeVisible();
    await expect(page.getByRole('heading',{name:'P/L Calendar',exact:true})).toBeVisible();
    const month = await page.locator('[data-calendar-month]').textContent();
    await page.getByRole('button',{name:'Next month',exact:true}).click();
    await expect(page.locator('[data-calendar-month]')).not.toHaveText(month!);
    await page.getByRole('button',{name:'Today',exact:true}).click();
    await expect(page.locator('[data-calendar-month]')).toHaveText(month!);
    await expect(page.locator('.sidebar a[href="/app/strategy"]')).toHaveCount(0);
    await expect(page.locator('.sidebar a[href="/app/backtesting"]')).toHaveCount(0);
    if (info.project.name === 'desktop') {
      const main = await page.locator('main').boundingBox(); const sidebar = await page.locator('.sidebar').boundingBox();
      expect(main!.x).toBeGreaterThanOrEqual(sidebar!.width);
      await page.getByRole('button',{name:'Hide sidebar'}).click();
      await expect(page.locator('.sidebar')).toHaveJSProperty('inert',true);
      await page.getByRole('button',{name:'Show sidebar'}).click();
      await expect(page.locator('.sidebar')).toHaveJSProperty('inert',false);
    }
  } finally { await db.user.delete({ where:{id:user.id} }); }
  expect(errors).toEqual([]);
});
