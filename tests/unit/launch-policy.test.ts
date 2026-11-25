import {readFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {isLaunchPathEnabled,LAUNCH_MODULES} from '../../apps/web/server/launch-policy.js';
import {renderPage,routes} from '../../apps/web/server/render.js';
import {canViewMemberRoute} from '../../apps/web/server/membership-policy.js';

const deferred=['/app/mapping','/app/signals','/app/community','/admin/mapping','/admin/signals'];
it('defers pages, nested content/media and mutation APIs independently of user role or query flags',()=>{
 expect(LAUNCH_MODULES).toEqual({analysis:false,signals:false,community:false});
 for(const path of [...deferred,'/api/admin/analysis','/api/content/analysis','/api/admin/signals','/api/content/signals','/api/community/messages','/api/community/reports']){
  for(const suffix of ['','/','/example/image','?enabled=true&role=ADMIN'])expect(isLaunchPathEnabled(path+suffix),path+suffix).toBe(false);
  for(const role of ['MEMBER','ADMIN'])expect(canViewMemberRoute({role},path),role+path).toBe(false);
 }
 for(const path of ['/','/app/membership','/app/settings','/app/academy','/admin/content','/api/auth/login','/api/admin/memberships','/api/profile','/api/content/lessons'])expect(isLaunchPathEnabled(path),path).toBe(true);
});
it('never renders disabled screens or advertises their routes from any active screen',async()=>{
 const principal={id:'launch-test',role:'ADMIN',name:'Example',email:'example@example.test'};
 for(const [route] of routes){
  const html=await renderPage(route,principal);
  if(!isLaunchPathEnabled(route)){expect(html,route).toBeNull();continue;}
  for(const path of deferred)expect(html,route+' links '+path).not.toContain(`href="${path}"`);
 }
 const home=await renderPage('/',null);
 for(const image of ['mapping-preview','signals-preview','community-preview'])expect(home).not.toContain(image);
 expect(home).toContain('homepage-v7/yenqo-workspace.webp');expect(home).toContain('EA execution is disabled.');expect(home).not.toMatch(/live trading|guaranteed (?:profit|returns?)/i);
});
it('keeps deferred implementations and stored data definitions for a later release',async()=>{
 for(const path of ['apps/web/server/editorial-routes.js','apps/web/server/community-routes.js','apps/web/templates/product-home.html'])expect((await readFile(path,'utf8')).length).toBeGreaterThan(100);
 const schema=await readFile('prisma/schema.prisma','utf8');
 for(const model of ['DailyPlan','ManualSignal','CommunityMessage'])expect(schema).toContain(`model ${model}`);
});
it('leaves Telegram promotion out of the launch portal as requested',async()=>{
 const user={id:'telegram-test',name:'Example',email:'example@example.test',role:'MEMBER',membership:null};
 const html=await renderPage('/app/membership',user);
 expect(html).not.toContain('Telegram Community');
 expect(html).not.toContain('href="https://t.me/');
});
