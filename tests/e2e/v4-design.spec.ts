import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const file=(name:string)=>pathToFileURL(resolve(`apps/web/pages/${name}.html`)).href;

test('V7 layered emblem motion pauses outside the hero and switches to static reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(file('demo-preview'));
 const root=page.locator('[data-homepage-v7]'),emblem=page.locator('.v7-emblem-plane');
 await expect(root).toHaveAttribute('data-motion','running');
 await expect.poll(()=>emblem.evaluate(node=>node.getAnimations().length)).toBe(1);
 const phase=await emblem.evaluate(node=>Number(node.getAnimations()[0].currentTime));
 await expect.poll(()=>emblem.evaluate(node=>Number(node.getAnimations()[0].currentTime))).toBeGreaterThan(phase);
 await page.locator('.v7-footer').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-motion','paused');
 await expect.poll(()=>emblem.evaluate(node=>node.getAnimations()[0]?.playState)).toBe('paused');
 await expect.poll(()=>emblem.evaluate(node=>node.getAnimations()[0]?.pending)).toBe(false);
 const paused=await emblem.evaluate(node=>node.getAnimations()[0]?.currentTime);await page.waitForTimeout(100);expect(await emblem.evaluate(node=>node.getAnimations()[0]?.currentTime)).toBe(paused);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(root).toHaveAttribute('data-motion','reduced');await expect.poll(()=>emblem.evaluate(node=>node.getAnimations().length)).toBe(0);
 await page.locator('.v7-hero').scrollIntoViewIfNeeded();await expect(page.locator('.v7-emblem')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(0);await expect(page.locator('script[src*="hero-art-renderer"],script[src*="cinematic-scene"]')).toHaveCount(0);
});

test('lower-power devices retain static art and existing private preview destinations',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2}));await page.goto(file('demo-preview'));
 await expect(page.locator('[data-homepage-v7]')).toHaveAttribute('data-motion','static');await expect(page.locator('.v7-emblem')).toBeVisible();
 expect(await page.locator('.v7-emblem-plane').evaluate(node=>node.getAnimations().length)).toBe(0);
 await page.locator('.v7-feature-card').getByRole('link',{name:/Explore Academy/}).click();await expect(page.locator('[data-education]')).toBeVisible();
 await page.goto(file('demo-preview'));await page.locator('.v7-feature-card').getByRole('link',{name:/Tools/}).click();await expect(page.getByRole('heading',{name:'Coming soon',exact:true})).toBeVisible();
 await page.goto(file('demo-preview'));await expect(page.locator('.offline-banner')).toBeVisible();await page.getByRole('navigation',{name:'Preview view'}).getByRole('link',{name:'Client View',exact:true}).click();await expect(page.locator('body')).toHaveClass(/clean-portal/);await expect(page.getByRole('heading',{name:'Your YENGFX workspace.'})).toBeVisible();
});
