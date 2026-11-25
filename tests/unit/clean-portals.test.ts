import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {renderPage,safeAssetPath} from '../../apps/web/server/render.js';
const admin={id:'clean-synthetic-admin',name:'Example Admin',email:'admin@example.test',role:'ADMIN'};
it('keeps protected homepage visuals unchanged outside the explicitly requested launch content',async()=>{
 const realEntry=JSON.parse(await readFile('docs/REAL_INDEX_ENTRY_BASELINE.json','utf8')) as Record<string,string>;
 expect(Object.keys(realEntry)).toEqual(['apps/web/pages/index.html']);
 const yenqo=JSON.parse(await readFile('docs/YENQO_REBRAND_BASELINE.json','utf8')) as Record<string,string>;
 const baseline=JSON.parse(await readFile('docs/CLEAN_PORTAL_HOMEPAGE_BASELINE.json','utf8')) as Record<string,string>;
 const v7=JSON.parse(await readFile('docs/V7_HOMEPAGE_BASELINE.json','utf8')) as Record<string,string>;
 const launch=JSON.parse(await readFile('docs/LAUNCH_SCOPE_BASELINE.json','utf8')) as Record<string,string>;
 for(const [path,hash] of Object.entries(baseline)){
  const data=path==='rendered-public-homepage'?await renderPage('/',null):await readFile(path);
  expect(createHash('sha256').update(data!).digest('hex'),path).toBe(yenqo[path]??realEntry[path]??v7[path]??launch[path]??hash);
 }
});
it('isolates the clean portal shell, preserves role filtering and avoids invented destinations',async()=>{
 for(const route of ['/','/auth/login','/auth/register'])expect(await renderPage(route,null)).not.toContain('/assets/portal-clean.css');
 expect(safeAssetPath('/assets/portal-clean.css')).toBe('portal-clean.css');
 const overview=await renderPage('/app',admin);expect(overview).toContain('clean-summary-grid');expect(overview).toContain('href="/app/academy"');expect(overview).not.toContain('data-client-briefing');expect(overview).not.toContain('data-tradingview-chart');expect(overview).not.toContain('data-trade-action');
 const adminHtml=await renderPage('/admin',admin);expect(adminHtml).toContain('id="system-status"');expect(adminHtml).not.toContain('href="/app/community"');expect(adminHtml).toContain('data-admin-services');expect(adminHtml).not.toMatch(/href="\/admin\/(moderation|system|billing|payments)"/);
 const moderation=await renderPage('/app/settings',admin);expect(moderation?.match(/<a class="v6-header-profile"[\s\S]*?<\/a>/)?.[0]).toContain('<small>Administrator</small>');
 for(const html of [overview,adminHtml])for(const match of html!.matchAll(/href="([^"]+)"/g))expect(match[1]).toMatch(/^(?:\/|#|https:\/\/)/);
 const free=await renderPage('/app/membership',{...admin,role:'MEMBER',membership:null});
 const nav=free!.match(/<aside class="sidebar"[^>]*>([\s\S]*?)<\/aside>/)?.[1]??'';
 for(const href of ['/app/membership','/app/settings','/app/mt5'])expect(nav).toContain(`href="${href}"`);
 for(const href of ['/admin','/app/academy','/app/mt5/devices','/app/journal','/app/mapping','/app/community','/app/signals'])expect(nav).not.toContain(`href="${href}"`);
});
