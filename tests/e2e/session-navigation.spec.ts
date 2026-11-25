import {test,expect} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {hashPassword,digestToken} from '../../apps/web/server/security.js';
const db=new PrismaClient();
test.afterAll(async()=>{await db.$disconnect();});
test('free members, verified members and admins keep login through logo/homepage navigation until Sign out',async({page,baseURL},info)=>{
 const prefix=`session-browser-${info.project.name}-${Date.now()}`,password='Synthetic session browser only!';const ids:string[]=[];
 try{
  const passwordHash=await hashPassword(password);
  const admin=await db.user.create({data:{email:`${prefix}-admin@example.test`,name:'Session admin fixture',role:'ADMIN',passwordHash}});ids.push(admin.id);
  for(const kind of ['free','approved','admin']){
   const user=kind==='admin'?admin:await db.user.create({data:{email:`${prefix}-${kind}@example.test`,name:'Session member fixture',passwordHash,membership:{create:kind==='approved'?{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:admin.id,verifiedAt:new Date()}:{status:'FREE'}}}});if(kind!=='admin')ids.push(user.id);
   const destination=kind==='admin'?'/admin':kind==='free'?'/app/membership':'/app';
   await page.goto('/auth/login');await page.getByLabel('Email or admin username').fill(user.email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(baseURL+destination);
   const before=(await page.context().cookies()).find(cookie=>cookie.name==='yengfx_session')!;expect(before.httpOnly).toBe(true);
   await page.locator('.compact-brand .brand').click();await expect(page).toHaveURL(baseURL+'/');await expect(page.locator('a[href="/auth/login"],a[href="/auth/register"]')).toHaveCount(0);await expect(page.locator('.v7-header-start')).toContainText('Open portal');
   const after=(await page.context().cookies()).find(cookie=>cookie.name==='yengfx_session')!;expect(after.value).toBe(before.value);expect(after.expires).toBe(before.expires);
   for(const path of ['/auth/login','/auth/register']){await page.goto(path);await expect(page).toHaveURL(baseURL+destination);}
   await page.locator('.compact-brand .brand').click();await page.locator('.v7-header-start').click();await expect(page).toHaveURL(baseURL+destination);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(page.viewportSize()!.width<1200)await page.locator('[data-menu-toggle]').click();await page.locator('[data-logout]:visible').first().click();await expect(page).toHaveURL(baseURL+'/auth/login');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(await db.session.findUnique({where:{tokenHash:digestToken(before.value)}})).toBeNull();await page.goto('/');await expect(page.locator('a[href="/auth/login"]').first()).toBeAttached();expect((await page.request.get('/api/profile')).status()).toBe(401);
  }
 }finally{await db.auditEvent.deleteMany({where:{actorId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});}
});
