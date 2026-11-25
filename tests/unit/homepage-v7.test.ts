import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {renderPage,safeAssetPath} from '../../apps/web/server/render.js';
import {isLaunchPathEnabled} from '../../apps/web/server/launch-policy.js';
const member={id:'v7-preservation',name:'Example member',email:'example@example.test',role:'MEMBER',membership:{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:'example-admin',verifiedAt:new Date(0)}};
it('preserves all captured private source, page, authentication and authorization bytes',async()=>{
 const yenqo=JSON.parse(await readFile('docs/YENQO_REBRAND_BASELINE.json','utf8')) as Record<string,string>;
 const baseline=JSON.parse(await readFile('docs/V7_PORTAL_PRESERVATION.json','utf8')) as Record<string,string>;
 const settings=JSON.parse(await readFile('docs/ACCOUNT_SETTINGS_REFRESH_BASELINE.json','utf8')) as Record<string,string>;
 const journal=JSON.parse(await readFile('docs/JOURNAL_NAV_REMOVAL_BASELINE.json','utf8')) as Record<string,string>;
 const email=JSON.parse(await readFile('docs/RESEND_REVIEW_BASELINE.json','utf8')) as Record<string,string>;
 const metaapi=JSON.parse(await readFile('docs/METAAPI_SWITCH_BASELINE.json','utf8')) as Record<string,string>;
 const avatar=JSON.parse(await readFile('docs/AVATAR_SIDEBAR_BASELINE.json','utf8')) as Record<string,string>;
 const approved=JSON.parse(await readFile('docs/MEMBERSHIP_APPROVED_BASELINE.json','utf8')) as Record<string,string>;
 const session=JSON.parse(await readFile('docs/SESSION_NAVIGATION_BASELINE.json','utf8')) as Record<string,string>;
 const tools=JSON.parse(await readFile('docs/TRADING_TOOLS_APPROVED_CHANGES.json','utf8')) as Record<string,string>;
 for(const key of Object.keys(tools))expect(key).toMatch(/^(?:render:\/app(?:$|\/)|apps\/web\/pages\/member\/|apps\/web\/templates\/portal-member-navigation\.html$|apps\/web\/server\/(?:index|membership-policy)\.js$)/);
 expect(Object.keys(session)).toEqual(['apps/web/server/index.js']);
 expect(Object.keys(approved).sort()).toEqual(['render:/app/membership','apps/web/pages/member/membership.html','apps/web/public/membership.js'].sort());
 expect(Object.keys(avatar)).toHaveLength(46);
 for(const key of Object.keys(avatar))expect(key).toMatch(/^(?:render:\/(?:app|admin)(?:\/|$)|apps\/web\/pages\/(?:member|admin)\/|apps\/web\/templates\/portal-layout\.html$|apps\/web\/public\/(?:portal-clean\.css|portal-v6\.js|profile-photo\.js)$)/);
 expect(Object.keys(metaapi).sort()).toEqual(['render:/app/settings','render:/app/calendar','apps/web/pages/member/settings.html','apps/web/pages/member/calendar.html'].sort());
 expect(Object.keys(email)).toEqual(['apps/web/server/membership-routes.js']);
 expect(Object.keys(journal)).toHaveLength(33);
 for(const key of Object.keys(journal)) {
  expect(Object.hasOwn(baseline,key)).toBe(true);
  expect(key).toMatch(/^(?:render:\/app(?:$|\/)|apps\/web\/pages\/member\/|apps\/web\/templates\/portal-member-navigation\.html$)/);
 }
 expect(Object.keys(settings).sort()).toEqual(['render:/app/calendar','render:/app/settings','render:/admin/settings','apps/web/pages/member/calendar.html','apps/web/pages/member/settings.html','apps/web/pages/admin/settings.html','apps/web/server/index.js','prisma/schema.prisma',...["render:/auth/login","apps/web/pages/auth/login.html","render:/auth/register","apps/web/pages/auth/register.html","render:/auth/forgot-password","apps/web/pages/auth/forgot-password.html","render:/auth/reset-password","apps/web/pages/auth/reset-password.html"]].sort());
 expect(Object.keys(baseline).length).toBeGreaterThan(80);
 for(const [key,hash]of Object.entries(baseline)){
  const path=key.slice(7);
  const data=key.startsWith('render:')?await renderPage(path,{...member,role:path.startsWith('/admin')?'ADMIN':'MEMBER'}):await readFile(key);
  expect(createHash('sha256').update(data!).digest('hex'),key).toBe(yenqo[key]??tools[key]??session[key]??approved[key]??avatar[key]??metaapi[key]??email[key]??journal[key]??settings[key]??hash);
 }
});
it('uses only supported entry destinations with no deferred modules or fake numerical proof',async()=>{
 const home=(await renderPage('/',null))!;
 for(const match of home.matchAll(/href="([^"]*)"/g)){
  const href=match[1];expect(href).toMatch(/^(?:\/|#)/);if(href.startsWith('/'))expect(isLaunchPathEnabled(href),href).toBe(true);
 }
 expect(home.match(/href="\/app"/g)?.length).toBeGreaterThanOrEqual(4);
 for(const claim of ['7+','100+','1,000+','2,348.52','Bullish','MT5 Live','1,284'])expect(home).not.toContain(claim);
 expect(home).not.toContain('{{COPYRIGHT_YEAR}}');expect(home).toContain('© 2026 YENQO.');
 expect(home.match(/Coming soon<\/span>/g)).toHaveLength(4);
 expect(home).toContain('Curriculum illustration, not a published lesson list.');
 expect(home).not.toContain('localhost:8080');expect(home).not.toContain('data-trade-action');
});
it('isolates the visual source and labels the actual member layout capture honestly',async()=>{
 const home=(await renderPage('/',null))!;
 expect(home).toContain('homepage-v7/yenqo-workspace.webp');expect(home).toContain('No live broker data');
 expect(home).not.toContain('screenshot.png');expect(home).not.toContain('APPROVED_FULL_PREVIEW');
 for(const asset of ['homepage-v7.css','homepage-v7.js','homepage-v7/yenqo-workspace.webp']){
  expect(safeAssetPath('/assets/'+asset)).toBe(asset);expect((await stat('apps/web/public/'+asset)).size).toBeGreaterThan(1000);
 }
 const script=await readFile('apps/web/public/homepage-v7.js','utf8');
 expect(script).not.toMatch(/fetch\(|\/api\//);expect(script).toContain('visibilitychange');expect(script).toContain('prefers-reduced-motion');
 const css=await readFile('apps/web/public/homepage-v7.css','utf8');expect(css).not.toMatch(/710vh|position:fixed.*v7-scene/);expect(css).toContain('@media(prefers-reduced-motion:reduce)');
});
it('personalizes only existing homepage entry links for trusted active users and leaves the guest preview unchanged',async()=>{
 const guest=(await renderPage('/',null))!;expect(guest).toContain('href="/auth/login"');
 for(const [user,destination,label]of [[member,'/app/mt5','My portal'],[{...member,membership:null},'/app/mt5','My portal'],[{...member,role:'ADMIN'},'/admin','Admin portal']] as const){
  const home=(await renderPage('/',user))!;expect(home).not.toMatch(/href="\/auth\/(?:login|register)"/);expect(home).toContain(`class="v7-login" href="${destination}">${label}</a>`);expect(home).toContain('Open portal');
  expect(await renderPage('/',user,new URLSearchParams(),true)).toBe(guest);
 }
});
