import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('cinematic homepage exposes each scene and an accessible static fallback', async ({page}) => {
  await page.goto(pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href);
  const home = page.locator('.cinema-v3');
  await expect(home).toHaveClass(/cinema-scroll-enabled/);
  await expect.poll(() => page.locator('.cinema-logo-stage img').first().evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  const alignment = await page.evaluate(() => {
    const logo = document.querySelector('.cinema-logo-stage')!.getBoundingClientRect();
    const ring = document.querySelector('.cinema-orbit')!.getBoundingClientRect();
    const rail = document.querySelector('.cinema-rail')!.getBoundingClientRect();
    return {dx:Math.abs(logo.x+logo.width/2-ring.x-ring.width/2),dy:Math.abs(logo.y+logo.height/2-ring.y-ring.height/2),clearOfRail:rail.width === 0 || logo.right+16 < rail.left};
  });
  expect(alignment.dx).toBeLessThan(2);
  expect(alignment.dy).toBeLessThan(2);
  expect(alignment.clearOfRail).toBe(true);
  await page.evaluate(() => {
    const sequence = document.querySelector('.cinema-sequence')!;
    const stage = document.querySelector('.cinema-stage')!;
    const header = document.querySelector('.cinema-header')!;
    const start = sequence.getBoundingClientRect().top+scrollY-header.clientHeight;
    scrollTo(0,start+(sequence.clientHeight-stage.clientHeight)*.2);
  });
  await expect.poll(() => page.locator('.cinema-logo-turntable').evaluate(image => parseFloat((image as HTMLElement).style.getPropertyValue('--cinema-turn')))).toBeGreaterThan(150);
  await expect(page.locator('.cinema-logo-turntable')).not.toHaveCSS('transform','none');
  await expect(page.locator('.cinema-logo-turntable')).toHaveCSS('transition-duration','2s');
  await expect(page.locator('.cinema-logo-back')).toHaveAttribute('aria-hidden','true');
  await expect(page.locator('.cinema-logo-turntable img').first()).toHaveCSS('backface-visibility','hidden');
  for (const [index,id] of ['vision','tools','mastery','community'].entries()) {
    await page.locator(`.cinema-chapters a[href="#${id}"]`).click();
    await expect(home).toHaveAttribute('data-chapter',String(index));
    await expect(page.locator(`#${id}`)).not.toHaveAttribute('inert');
    await expect(page.locator(`#${id} .button-gold`)).toBeVisible();
    await expect(page.locator('.cinema-slide[inert]')).toHaveCount(3);
    if(page.viewportSize()!.width<=1000){
      await page.waitForTimeout(850);
      const composition=await page.evaluate(({id,index})=>{
        const art=document.querySelector('.cinema-logo-stage')!.getBoundingClientRect();
        const heading=document.querySelector(`#${id} h1,#${id} h2`)!.getBoundingClientRect();
        const description=document.querySelector(`#${id} .cinema-slide-copy>p`)!.getBoundingClientRect();
        const buttons=document.querySelector(`#${id} .hero-actions`)!.getBoundingClientRect();
        return {gap:index%2===0?art.left-heading.right:heading.left-art.right,bottom:buttons.bottom,descriptionGap:description.top-art.bottom};
      },{id,index});
      expect(composition.gap).toBeGreaterThan(16);
      expect(composition.bottom).toBeLessThan(page.viewportSize()!.height-12);
      expect(composition.descriptionGap).toBeGreaterThan(16);
    }
  }
  await page.locator('.cinema-chapters a[href="#vision"]').click();
  await page.locator('.cinema-stage-footer a').click();
  await expect(home).toHaveAttribute('data-chapter','1');
  await expect(page.locator('.cinema-stage-footer>span')).toContainText('02 / 04');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(home).not.toHaveClass(/cinema-scroll-enabled/);
  await expect(page.locator('.cinema-slide[inert]')).toHaveCount(0);
  await expect(page.locator('.cinema-logo-turntable')).toHaveCSS('transform','none');
  for (const id of ['vision','tools','mastery','community']) await expect(page.locator(`#${id}`)).toBeVisible();
});

test('homepage WebGL renders locally, pauses offscreen and falls back on context loss',async ({page},info) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href);
  const home=page.locator('.cinema-v3');
  await expect(home).toHaveClass(/cinema-webgl-ready/,{timeout:20000});
  await expect(page.locator('[data-cinema-canvas]')).toHaveCSS('opacity','1');
  await expect(page.locator('.cinema-slide').last()).toHaveCSS('visibility','hidden');
  await expect(page).toHaveTitle(/YENGHUB.*The Edge Is Earned/);
  const dimensions=await page.locator('[data-cinema-canvas]').evaluate(canvas=>({buffer:(canvas as HTMLCanvasElement).width,width:canvas.clientWidth}));
  expect(dimensions.buffer).toBeLessThanOrEqual(Math.ceil(dimensions.width*1.5));
  await page.locator('.cinema-chapters a').first().click();
  await page.screenshot({path:`docs/screenshots/${info.project.name}-yenghub-webgl.png`});
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  expect(await page.locator('.cinema-stage').evaluate(stage=>stage.getBoundingClientRect().bottom)).toBeLessThan(await page.locator('.cinema-header').evaluate(header=>header.clientHeight));
  await expect(home).toHaveAttribute('data-scene-state','paused');
  await page.locator('.cinema-chapters a').first().click();
  await expect(home).toHaveAttribute('data-scene-state','running');
  await page.locator('[data-cinema-canvas]').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(home).not.toHaveClass(/cinema-webgl-ready/);
  await expect(page.locator('.cinema-logo-stage')).toBeVisible();
  expect(errors).toEqual([]);
});

test('missing WebGL keeps the official logo and all content usable',async ({page}) => {
  await page.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,kind:string,...args:unknown[]){return kind.startsWith('webgl')?null:Reflect.apply(getContext,this,[kind,...args]);}});
  });
  await page.goto(pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href);
  await expect(page.locator('.cinema-v3')).toHaveAttribute('data-scene-state','fallback');
  await expect(page.locator('.cinema-logo-stage')).toBeVisible();
  await expect(page.locator('.cinema-header-entry')).toHaveAttribute('data-app-href','/app');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.cinema-slide[inert]')).toHaveCount(0);
});

test('native content reveals and notification bell respect reduced motion',async ({page})=>{
  await page.goto(pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href);
  const gallery=page.locator('[data-accordion-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  await expect.poll(()=>gallery.locator('.gallery-panel').first().evaluate(panel=>panel.getAnimations().length)).toBeGreaterThan(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>gallery.locator('.gallery-panel').first().evaluate(panel=>panel.getAnimations().length)).toBe(0);
  await expect(gallery).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(pathToFileURL(resolve('apps/web/pages/member/notifications.html')).href);
  const bell=page.getByRole('link',{name:'Open notifications'});
  await bell.hover();
  await expect(bell.locator('.bell-glyph')).toHaveCSS('animation-name','bell-ring');
  await expect(bell).toHaveAttribute('href','notifications.html');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(bell.locator('.bell-glyph')).toHaveCSS('animation-name','none');
});
