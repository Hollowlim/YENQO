import {test,expect} from '@playwright/test';import {PrismaClient} from '@prisma/client';import {hashPassword} from '../../apps/web/server/security.js';
import {requireLocalTestDatabase} from '../support/test-database';requireLocalTestDatabase();
const db=new PrismaClient();test.afterAll(async()=>{await db.$disconnect();});
test('free member calculators, validation, keyboard tabs and disconnected MT5 work without a provider',async({page,baseURL},info)=>{
 const tag='tools-browser-'+info.project.name+'-'+Date.now(),password='Synthetic calculator browser pass!';
 const user=await db.user.create({data:{email:tag+'@example.test',name:'Calculator test member',passwordHash:await hashPassword(password),membership:{create:{status:'FREE'}}}});
 const errors:string[]=[],requests:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>requests.push(r.url()));
 try{
  await page.goto('/auth/login');await page.getByLabel('Email or admin username').fill(user.email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(baseURL+'/app/membership');
  if(page.viewportSize()!.width<1200)await page.locator('[data-menu-toggle]').click();await page.locator('.nav-links a[href="/app/mt5"]:visible').click();await expect(page).toHaveURL(baseURL+'/app/mt5');
  const output=page.locator('[data-tools-primary]');await expect(output).toHaveText('USD 50.00');
  await page.getByLabel('SELL',{exact:true}).check();await expect(output).toHaveText('−USD 50.00');await page.getByRole('button',{name:'Load example'}).click();
  await page.getByText('Broker symbol settings',{exact:false}).click();await page.getByLabel('Account currency',{exact:true}).fill('MYR');await page.getByLabel('Conversion rate:',{exact:false}).fill('4.5');await page.getByLabel('Total extra costs',{exact:false}).fill('5');await expect(output).toHaveText('MYR 220.00');
  await page.getByRole('button',{name:'Load example'}).click();await page.locator('[data-tools-fields]:visible').getByLabel('Position volume (lots)',{exact:true}).fill('0.015');await expect(page.locator('[data-tools-error]')).toContainText('lot step');await expect(output).toHaveText('—');await page.getByRole('button',{name:'Load example'}).click();
  await page.getByRole('tab',{name:'Risk & Lot Size',exact:true}).click();await expect(output).toHaveText('0.01 lots');await expect(page.locator('[data-tools-results]')).toContainText('USD 8.00');
  await page.getByLabel('Account balance',{exact:true}).fill('100');await expect(output).toHaveText('No valid position');await expect(page.locator('[data-tools-notice]')).toContainText('below broker minimum');
  await page.getByRole('button',{name:'Load example'}).click();await page.locator('[data-tools-fields]:visible').getByLabel('Stop-loss price',{exact:true}).fill('4010');await expect(page.locator('[data-tools-error]')).toContainText('stop < entry');
  const reward=page.getByRole('tab',{name:'Risk / Reward',exact:true});await reward.click();await expect(output).toHaveText('2.00 : 1');await expect(page.locator('[data-tools-results]')).toContainText('33.33%');
  await page.getByLabel('SELL',{exact:true}).check();await page.locator('[data-tools-fields]:visible').getByLabel('Stop-loss price',{exact:true}).fill('4008');await page.locator('[data-tools-fields]:visible').getByLabel('Take-profit price',{exact:true}).fill('3984');await expect(output).toHaveText('2.00 : 1');
  await reward.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-tool-tab=mt5]')).toBeFocused();await expect(page.locator('[data-tools-mt5-status]')).toContainText('No paired MT5 device');await expect(page.locator('.yh-account-grid strong')).toHaveText(['—','—','—','—']);
  await page.getByRole('button',{name:'Check connection status'}).click();await expect(page.locator('[data-tools-mt5-status]')).toContainText('not available in this release');
  expect(requests.some(url=>/metaapi|agiliumtrade|\/api\/broker\//i.test(url))).toBe(false);expect(requests.some(url=>url.includes('/api/tools/mt5-snapshot'))).toBe(true);
  await page.keyboard.press('Home');await page.getByRole('tab',{name:'Profit & Loss',exact:true}).click();await page.getByRole('button',{name:'Load example'}).click();await page.getByText('Broker symbol settings',{exact:false}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:`docs/screenshots/trading-tools/${info.project.name}.png`,fullPage:true});expect(errors).toEqual([]);
 }finally{await db.auditEvent.deleteMany({where:{actorId:user.id}});await db.user.delete({where:{id:user.id}});}
});
