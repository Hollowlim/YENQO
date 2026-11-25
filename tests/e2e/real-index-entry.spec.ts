import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {renderPage,safeAssetPath} from '../../apps/web/server/render.js';
const index=pathToFileURL(resolve('apps/web/pages/index.html')).href;
const demo=pathToFileURL(resolve('apps/web/pages/demo-preview.html')).href;
test('index opens the HTTP app and its real login form, without an offline role switcher',async({page})=>{
 await page.route('http://127.0.0.1:3000/**',async route=>{
  const path=new URL(route.request().url()).pathname,asset=safeAssetPath(path);
  if(asset){await route.fulfill({contentType:asset.endsWith('.webp')?'image/webp':asset.endsWith('.js')?'text/javascript':asset.endsWith('.ttf')?'font/ttf':'text/css',body:await readFile(resolve('apps/web/public',asset))});return;}
  const html=await renderPage(path,null);await route.fulfill({status:html?200:404,contentType:'text/html',body:html??'Not found'});
 });
 await page.goto(index);await expect(page).toHaveURL('http://127.0.0.1:3000/');
 await expect(page.locator('.offline-banner,[data-local-entry]')).toHaveCount(0);
 await expect(page.locator('html')).not.toHaveAttribute('data-offline-preview','true');
 await page.getByRole('link',{name:'Member login',exact:true}).click();
 await expect(page).toHaveURL('http://127.0.0.1:3000/auth/login');
 await expect(page.getByLabel('Email or admin username',{exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
});
test('a stopped server leaves a usable retry screen and never redirects into the demo',async({page})=>{
 let attempts=0;await page.route('http://127.0.0.1:3000/**',route=>{attempts++;return route.abort();});
 await page.goto(index);await expect(page.locator('[data-local-entry-status]')).toContainText('not reachable');
 await expect(page).toHaveURL(index);await expect(page.locator('.v7-hero h1')).toBeVisible();
 await page.getByRole('button',{name:'Retry connection'}).click();await expect(page.locator('[data-local-entry-status]')).toContainText('not reachable');expect(attempts).toBeGreaterThanOrEqual(2);
 await expect(page.getByRole('link',{name:'Login',exact:true})).toHaveAttribute('href','http://127.0.0.1:3000/auth/login');
 await expect(page.locator('html')).not.toHaveAttribute('data-offline-preview','true');
});
test('demo-preview stays offline and its login form cannot submit credentials',async({page})=>{
 await page.goto(demo);await expect(page.locator('.offline-banner')).toBeVisible();
 await page.getByRole('link',{name:'Member login',exact:true}).click();
 await expect(page).toHaveURL(/^file:/);await expect(page.locator('[data-auth-form] input[type="email"], [data-auth-form] input[type="text"]').first()).toBeDisabled();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeDisabled();
});
