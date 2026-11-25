import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const entry=pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href;

test('V7 reference hierarchy, honest product preview and supported routes work across devices',async({page},info)=>{
 const errors:string[]=[],privateRequests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\//.test(r.url()))privateRequests.push(r.url());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(entry);await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Read the market.Build your edge.');
 await expect(page.locator('.v7-feature-card')).toHaveCount(4);await expect(page.locator('.v7-course')).toHaveCount(4);
 await expect(page.locator('.v7-platform-preview')).toContainText('No live broker data');
 await expect(page.locator('.v7-curriculum')).toContainText('not a published lesson list');
 await expect(page.locator('a[data-app-href="/app/community"],a[data-app-href="/app/mapping"],a[data-app-href="/app/signals"]')).toHaveCount(0);
 await expect(page.locator('.v7-footer')).toContainText('© 2026 YENGFX.');
 await expect(page.locator('body')).not.toContainText('{{COPYRIGHT_YEAR}}');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Load every illustration even when it is outside a horizontal scroll region.
 for(const img of await page.locator('img').all())await img.evaluate(node=>{(node as HTMLImageElement).loading='eager';});
 await expect.poll(()=>page.locator('img').evaluateAll(nodes=>nodes.every(node=>(node as HTMLImageElement).complete&&(node as HTMLImageElement).naturalWidth>0))).toBe(true);
 for(const href of await page.locator('a[href^="#"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')!)))expect(await page.locator(href).count(),href).toBe(1);
 await page.screenshot({path:`docs/screenshots/v7/${info.project.name}-homepage-tested.png`,fullPage:true});
 await page.locator('.v7-hero .v7-button-outline').click();await expect(page.locator('#platform h2')).toBeInViewport();
 expect(await page.locator('.v7-emblem').evaluate(node=>(node as HTMLElement).offsetWidth/(node as HTMLElement).offsetHeight)).toBeCloseTo(1.5,1);
 expect(await page.locator('.v7-legacy-symbol img').evaluate(node=>(node as HTMLElement).offsetWidth/(node as HTMLElement).offsetHeight)).toBeCloseTo(1.5,1);
 expect(privateRequests).toEqual([]);expect(errors).toEqual([]);
 const contrast=await page.locator('body').evaluate(node=>{
   const s=getComputedStyle(node);
   const luminance=(hex:string)=>{const v=hex.replace('#','').match(/../g)!.map(p=>parseInt(p,16)/255).map(p=>p<=.04045?p/12.92:((p+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
   return (luminance(s.getPropertyValue('--v7-muted').trim())+.05)/(luminance(s.getPropertyValue('--v7-panel').trim())+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('compact menu supports touch, keyboard escape, focus and real login/register links',async({page})=>{
 await page.goto(entry);await page.emulateMedia({reducedMotion:'reduce'});
 const menu=page.getByRole('navigation',{name:'Mobile site navigation'}),toggle=page.getByRole('button',{name:'Open site navigation'});
 if(page.viewportSize()!.width<=850){
  await expect(menu).toBeHidden();const bounds=await toggle.boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(44);expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await toggle.click();await expect(menu).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(toggle).toBeFocused();
  await toggle.click();await menu.getByRole('link',{name:'Academy',exact:true}).click();await expect(menu).toBeHidden();await expect(page.locator('#academy h2')).toBeInViewport();
  await toggle.click();await menu.getByRole('link',{name:'Create an account',exact:true}).click();
 }else{await expect(toggle).toBeHidden();await page.locator('.v7-register-link').click();}
 await expect(page.locator('form[data-auth-form="register"]')).toBeVisible();
 await page.goto(entry);await page.getByRole('link',{name:'Member login',exact:true}).click();await expect(page.locator('form[data-auth-form="login"]')).toBeVisible();
});

test('Academy carousel supports buttons and keyboard without requiring drag gestures',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(entry);
 const track=page.getByRole('region',{name:/Planned Academy curriculum/});await track.scrollIntoViewIfNeeded();
 const previous=page.getByRole('button',{name:'Previous Academy topics'}),next=page.getByRole('button',{name:'Next Academy topics'});
 await expect(previous).toBeDisabled();await expect(next).toBeEnabled();await next.click();
 await expect.poll(()=>track.evaluate(node=>node.scrollLeft)).toBeGreaterThan(30);await expect(previous).toBeEnabled();
 await track.focus();await page.keyboard.press('End');await expect(next).toBeDisabled();await page.keyboard.press('Home');await expect(previous).toBeDisabled();
 await page.keyboard.press('ArrowRight');await expect.poll(()=>track.evaluate(node=>node.scrollLeft)).toBeGreaterThan(30);
 await previous.click();await expect.poll(()=>track.evaluate(node=>node.scrollLeft)).toBeLessThan(10);
});

test('content, navigation and static emblem remain usable without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 try{const page=await context.newPage();await page.goto(entry);await expect(page.locator('.v7-emblem')).toBeVisible();await expect(page.locator('.v7-mobile-nav')).toBeVisible();for(const heading of await page.locator('h2').all())await expect(heading).toBeVisible();await expect(page.locator('.v7-course-track')).toHaveAttribute('tabindex','0');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}finally{await context.close();}
});
