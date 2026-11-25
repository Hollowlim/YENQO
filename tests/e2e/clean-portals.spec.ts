import {test,expect} from '@playwright/test';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const pageFile=(screen:string)=>pathToFileURL(resolve(`apps/web/pages/${screen}.html`)).href;
test('clean shell has unique supported navigation, usable touch controls and honest source states',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',route=>route.abort());
 for(const role of ['member','admin']){
  await page.goto(pageFile(role+'/overview'));await expect(page.locator('body')).toHaveClass(/clean-portal/);
  const hrefs=await page.locator('.sidebar .nav-link').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-app-href')??node.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(role==='member'){
   await expect(page.getByRole('heading',{name:'Your YENGFX workspace.',exact:true})).toBeVisible();await expect(page.locator('.clean-summary')).toHaveCount(3);
   await expect(page.locator('.clean-summary-grid')).toContainText('Not connected');
   await expect(page.getByRole('heading',{name:'Learn at your own pace.',exact:true})).toBeVisible();
   await expect(page.locator('[data-client-briefing], [data-tradingview-chart]')).toHaveCount(0);
  }else{
   await expect(page.locator('.clean-core-metrics .v6-kpi')).toHaveCount(3);
   await expect(page.locator('[data-admin-source]')).toContainText('Offline layout preview');
   await page.locator('.clean-additional-metrics summary').click();await expect(page.locator('.clean-additional-metrics [data-admin-metric="publishedLessons"]')).toBeVisible();
  }
  if(page.viewportSize()!.width<1200){
   for(const control of ['[data-menu-toggle]','.notification-bell','.v6-header-profile']){const box=await page.locator(control).boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);}
   await page.locator('[data-menu-toggle]').click();await expect(page.locator('#compact-navigation')).toBeVisible();
   await page.keyboard.press('Escape');await expect(page.locator('#compact-navigation')).toBeHidden();await expect(page.locator('[data-menu-toggle]')).toBeFocused();
  }
  await page.screenshot({path:`docs/screenshots/clean-portal/${info.project.name}-${role}-verified.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});
test('keyboard focus, existing dialogs and reduced motion remain accessible',async({page})=>{
 await page.route('https://**',route=>route.abort());await page.goto(pageFile('member/overview'));
 const search=page.getByRole('searchbox',{name:'Find a workspace',exact:true});await search.fill('Tools');
 await expect(page.locator('[data-portal-search-results]')).toBeVisible();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-portal-search-results] a').first()).toBeFocused();
 await page.keyboard.press('Escape');await expect(search).toBeFocused();await expect(page.locator('[data-portal-search-results]')).toBeHidden();
 await expect(page.locator('.v6-workspace-search>label')).toHaveCSS('outline-style','solid');
 await page.goto(pageFile('admin/members'));const dialog=page.locator('[data-membership-dialog]');await dialog.evaluate(node=>(node as HTMLDialogElement).showModal());await expect(dialog).toBeVisible();expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(page.viewportSize()!.width);await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 await page.goto(pageFile('member/settings'));await expect(page.locator('[data-profile-card]')).toHaveCSS('transform','none');await expect(page.locator('[data-profile-card]')).toHaveCSS('transition-duration','0s');
 const contrast=await page.locator('body').evaluate(node=>{
  const s=getComputedStyle(node),c=s.getPropertyValue('--cp-muted').trim(),b=s.getPropertyValue('--cp-panel').trim();
  const lum=(hex:string)=>{const values=hex.replace('#','').match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};return(lum(c)+.05)/(lum(b)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);
});
