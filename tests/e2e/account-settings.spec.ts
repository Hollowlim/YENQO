import {test,expect} from '@playwright/test';import {renderPage} from '../../apps/web/server/render.js';
import sharp from 'sharp';
const user={id:'synthetic-browser-only',name:'Example Member',email:'example@example.test',role:'MEMBER',membership:{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:'synthetic-admin',verifiedAt:new Date()}};
test('approved membership hides plan cards and request form, while revocation restores them',async({page},info)=>{
 await page.clock.install();let current='PENDING';
 const html=await renderPage('/app/membership',{...user,membership:{...user.membership,status:'PENDING'}});
 await page.route('**/app/membership',route=>route.fulfill({contentType:'text/html',body:html!}));
 await page.route('**/api/**',route=>route.fulfill({json:{membership:{status:current,version:1,reviewReason:current==='REVOKED'?'Changed IB after broker review.':null},fullAccess:current==='APPROVED',isAdmin:false}}));
 await page.goto('/app/membership');await expect(page.locator('[data-membership-status]')).toHaveText('PENDING');await expect(page.locator('.membership-plans')).toBeVisible();await expect(page.locator('#membership-request')).toBeVisible();await expect(page.locator('.membership-plans .plan-card')).toHaveCount(2);
 await page.getByLabel('MT5 account number',{exact:true}).focus();current='APPROVED';await page.clock.runFor(30001);await expect(page.locator('[data-membership-status]')).toHaveText('APPROVED');await expect(page.locator('.membership-plans')).toBeHidden();await expect(page.locator('#membership-request')).toBeHidden();await expect(page.locator('[data-membership-status]')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:`docs/screenshots/account-settings/${info.project.name}-membership-approved.png`,fullPage:true});
 current='REVOKED';await page.clock.runFor(30001);await expect(page.locator('[data-membership-status]')).toHaveText('REVOKED');await expect(page.locator('.membership-plans')).toBeVisible();await expect(page.locator('#membership-request')).toBeVisible();await expect(page.locator('[data-membership-reason]')).toContainText('Changed IB');
});
test('client and admin change photos through the avatar with keyboard access, preview, cancel and removal',async({page},info)=>{
 const picture=await sharp({create:{width:80,height:120,channels:3,background:'#ba935c'}}).png().toBuffer();
 for(const role of ['MEMBER','ADMIN']){
  const path=role==='ADMIN'?'/admin/settings':'/app/settings',html=await renderPage(path,{...user,role});let saves=0;
  await page.route('**'+path,route=>route.fulfill({contentType:'text/html',body:html!}));
  await page.route('**/api/**',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.pathname==='/api/profile/photo'){
    if(request.method()==='GET')return route.fulfill({contentType:'image/png',body:picture});
    if(request.method()==='PUT'){expect(Buffer.from(request.postDataJSON().image,'base64')).toEqual(picture);saves++;return route.fulfill({json:{message:'Profile photo saved.',photoUrl:'/api/profile/photo?v='+'a'.repeat(64)}});}
    return route.fulfill({json:{message:'Profile photo removed.',photoUrl:null}});
   }
   return route.fulfill({json:url.pathname==='/api/profile'?{profile:{...user,name:'Example Member',role,profileVersion:0}}:{available:false,entitled:true,connection:null}});
  });
  await page.goto(path);await expect(page.locator('[data-photo-file]')).toBeHidden();await expect(page.getByText('Choose a profile photo',{exact:true})).toHaveCount(0);await expect(page.locator('[data-photo-actions]')).toBeHidden();
  const picker=page.getByRole('button',{name:'Change profile photo',exact:true});await picker.focus();await expect(picker).toBeEnabled();const chooser=page.waitForEvent('filechooser');await picker.press('Enter');await (await chooser).setFiles({name:'synthetic-avatar.png',mimeType:'image/png',buffer:picture});
  await expect(page.locator('[data-photo-status]')).toContainText('Preview only');await expect(page.locator('[data-photo-actions]')).toBeVisible();await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await expect(page.locator('[data-photo-actions]')).toBeHidden();expect(saves).toBe(0);
  const another=page.waitForEvent('filechooser');await picker.click();await (await another).setFiles({name:'synthetic-avatar.png',mimeType:'image/png',buffer:picture});await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.locator('[data-photo-status]')).toContainText('Profile photo saved');expect(saves).toBe(1);await expect(page.locator('.v6-header-profile img')).toBeVisible();await expect(page.locator('[data-photo-actions]')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:`docs/screenshots/account-settings/${info.project.name}-avatar-${role.toLowerCase()}.png`,fullPage:true});
  await page.getByRole('button',{name:'Remove photo',exact:true}).click();await expect(page.locator('[data-photo-status]')).toContainText('Profile photo removed');await expect(page.locator('.v6-header-profile img')).toHaveCount(0);await expect(picker).toBeEnabled();
 }
});
test('sidebar panel icon reflects open and closed state without changing navigation',async({page})=>{
 const html=await renderPage('/app/settings',user);await page.route('**/app/settings',route=>route.fulfill({contentType:'text/html',body:html!}));await page.route('**/api/**',route=>route.fulfill({json:{available:false,profile:{...user,profileVersion:0}}}));await page.goto('/app/settings');
 if(page.viewportSize()!.width>=1200){
  const button=page.locator('[data-v2-collapse]');await expect(button).toHaveAccessibleName('Hide sidebar');await expect(button.locator('.portal-sidebar-icon')).toBeVisible();await button.click();await expect(button).toHaveAccessibleName('Show sidebar');await expect(button).toHaveAttribute('aria-expanded','false');await expect(page.locator('#desktop-sidebar')).toHaveAttribute('inert','');await button.click();await expect(button).toHaveAccessibleName('Hide sidebar');await expect(button).toHaveAttribute('aria-expanded','true');
 }else{
  const button=page.locator('[data-menu-toggle]');await expect(button.locator('.portal-sidebar-icon')).toBeVisible();await button.click();await expect(button).toHaveAccessibleName('Close navigation');await expect(page.locator('#compact-navigation')).toBeVisible();await page.keyboard.press('Escape');await expect(button).toHaveAccessibleName('Open navigation');await expect(page.locator('#compact-navigation')).toBeHidden();await expect(button).toBeFocused();
 }
});
test('MetaApi connection uses own profile, clears credentials and distinguishes provisioning from synced history',async({page},info)=>{
 const html=await renderPage('/app/settings',user);let connection:Record<string,unknown>|null=null;
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/app/settings',route=>route.fulfill({contentType:'text/html',body:html!}));
 await page.route('**/api/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  expect(path).not.toContain('pc-broker');
  if(path==='/api/profile')return route.fulfill({json:{profile:{...user,brokerName:'JUSTMARKET',mt5Account:'123456',mt5Server:'JustMarkets-Demo2',profileVersion:0}}});
  if(path==='/api/broker/servers')return route.fulfill({json:{servers:['JustMarkets-Demo2'],source:'reference',message:'Confirm the exact server in MT5.'}});
  if(path==='/api/broker/connection'&&request.method()==='POST'){
   const data=request.postDataJSON();expect(data).toMatchObject({login:'123456',server:'JustMarkets-Demo2',consent:true,investorPassword:'synthetic-investor'});expect(data.userId).toBeUndefined();expect(data.METAAPI_TOKEN).toBeUndefined();
   connection={state:'CONNECTING',version:0,canSync:true,requestKey:data.requestKey};return route.fulfill({status:202,json:{message:'Connection created. Sync history to verify investor access.'}});
  }
  if(path==='/api/broker/sync'){
   expect(request.postDataJSON()).toEqual({version:0});connection={...connection,state:'READY',version:1,canSync:true,lastSyncedAt:new Date().toISOString()};return route.fulfill({json:{message:'Broker history synced. Saved snapshot, not a live feed.'}});
  }
  return route.fulfill({json:{available:true,entitled:true,connection}});
 });
 await page.goto('/app/settings');const input=page.getByLabel('Investor password',{exact:true});await expect(input).toBeEnabled();await input.fill('synthetic-investor');await page.getByRole('button',{name:'Show investor password',exact:true}).click();await expect(input).toHaveAttribute('type','text');await page.locator('[data-broker-form] [name="consent"]').check();await page.getByRole('button',{name:'Connect read-only account',exact:true}).click();
 await expect(page.locator('[data-broker-state]')).toHaveText('Awaiting broker sync');await expect(input).toHaveValue('');await expect(input).toHaveAttribute('type','password');expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('synthetic-investor');
 await page.getByRole('button',{name:'Sync history',exact:true}).click();await expect(page.locator('[data-broker-state]')).toHaveText('History synced');expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});
 await page.screenshot({path:'docs/screenshots/account-settings/'+info.project.name+'-metaapi-connection.png',fullPage:true});
});
test('unconfigured MetaApi explains disabled password entry and preserves profile editing',async({page})=>{
 const html=await renderPage('/app/settings',user);await page.route('**/app/settings',route=>route.fulfill({contentType:'text/html',body:html!}));
 await page.route('**/api/**',route=>route.fulfill({json:route.request().url().endsWith('/api/profile')?{profile:{...user,brokerName:'JUSTMARKET',mt5Account:'123456',mt5Server:'JustMarkets-Demo2',profileVersion:0}}:{available:false,entitled:true,connection:null,message:'MetaApi setup is pending. The owner must configure the private API token.'}}));
 await page.goto('/app/settings');await expect(page.getByLabel('Investor password',{exact:true})).toBeDisabled();await expect(page.locator('[data-broker-message]')).toContainText('MetaApi setup is pending');await expect(page.locator('[data-client-profile] button[type="submit"]')).toBeEnabled();await expect(page.locator('[data-pc-form],[data-statement-import]')).toHaveCount(0);
});
test('stopped MetaApi account shows recovery instructions after sync failure and reload',async({page})=>{
 const html=await renderPage('/app/settings',user),message='Your MetaApi account is stopped. The site owner must start/deploy this existing account. Then use Sync history.';
 await page.route('**/app/settings',route=>route.fulfill({contentType:'text/html',body:html!}));
 await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/profile')return route.fulfill({json:{profile:{...user,brokerName:'JUSTMARKET',mt5Account:'123456',mt5Server:'JustMarkets-Demo2',profileVersion:0}}});if(path==='/api/broker/sync')return route.fulfill({status:503,json:{message,errorCode:'BROKER_UNDEPLOYED'}});return route.fulfill({json:{available:true,entitled:true,connection:{state:'ERROR',version:1,canSync:true},message,errorCode:'BROKER_UNDEPLOYED'}});});
 await page.goto('/app/settings');await expect(page.locator('[data-broker-message]')).toContainText('account is stopped');await page.getByRole('button',{name:'Sync history',exact:true}).click();await expect(page.locator('[data-broker-message]')).toContainText('start/deploy');await page.reload();await expect(page.locator('[data-broker-message]')).toContainText('account is stopped');await expect(page.getByLabel('Investor password',{exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Disconnect',exact:true})).toBeEnabled();
});
test('missing saved MT5 details disables connect with an actionable explanation',async({page})=>{
 const html=await renderPage('/app/settings',user);await page.route('**/app/settings',route=>route.fulfill({contentType:'text/html',body:html!}));await page.route('**/api/**',route=>route.fulfill({json:route.request().url().endsWith('/api/profile')?{profile:{...user,profileVersion:0}}:{available:true,entitled:true,connection:null}}));
 await page.goto('/app/settings');await expect(page.getByLabel('Investor password',{exact:true})).toBeDisabled();await expect(page.locator('[data-broker-message]')).toContainText('Save your broker, MT5 account and exact server');
});
test('calendar uses MetaApi snapshot labels, manual sync, source freshness and MYT day details',async({page},info)=>{
 const html=await renderPage('/app/calendar',user),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());let stale=true;
 await page.route('**/app/calendar',route=>route.fulfill({contentType:'text/html',body:html!}));
 await page.route('**/api/broker/calendar?*',route=>route.fulfill({json:{available:true,source:'metaapi',stale,connection:{version:2,canSync:true,currency:'USD',lastSyncedAt:new Date(Date.now()-(stale?1200000:0)).toISOString()},days:{[today]:{net:'9',executions:2}},metrics:{weekly:'9',monthly:'9',yearly:'9',winRate:'100'},basis:'Synthetic browser fixture only.'}}));
 await page.route('**/api/broker/sync',route=>{expect(route.request().postDataJSON()).toEqual({version:2});stale=false;return route.fulfill({json:{message:'Saved snapshot updated.'}});});
 await page.goto('/app/calendar');await expect(page.locator('[data-calendar-source]')).toHaveText('MetaApi · MT5 snapshot');await expect(page.locator('[data-calendar-status]')).toContainText('stale');await expect(page.locator('[data-performance-metric="weekly"]')).toContainText('9.00');await page.locator('[data-date="'+today+'"]').click();await expect(page.locator('[data-selected-summary]')).toContainText('2 trading executions');
 await page.getByRole('button',{name:'Sync history',exact:true}).click();await expect(page.locator('[data-calendar-status]')).toContainText('snapshot from MetaApi');await expect(page.locator('[data-calendar-sync]')).toBeEnabled();await expect(page.locator('[data-statement-import],input[type="file"]')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});
 await page.screenshot({path:'docs/screenshots/account-settings/'+info.project.name+'-metaapi-calendar.png',fullPage:true});
});
test('sign-in and signup remove decorative sidebar branches and retain password visibility',async({page})=>{
 for(const path of ['/auth/login','/auth/register']){const html=await renderPage(path,null);await page.route('**'+path,route=>route.fulfill({contentType:'text/html',body:html!}));await page.goto(path);await expect(page.locator('body')).toHaveClass(/auth-page/);const branch=page.locator('.sidebar .branch-list').first();expect(await branch.evaluate(node=>getComputedStyle(node,'::before').content)).toBe('none');expect(await branch.locator('.nav-link').first().evaluate(node=>getComputedStyle(node,'::before').content)).toBe('none');const password=page.getByLabel('Password',{exact:true});await password.fill('Synthetic only');await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(password).toHaveAttribute('type','text');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
