import {readFile,stat} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {renderPage,safeAssetPath} from '../../apps/web/server/render.js';

it('explains the actual product, access and next steps without performance or connection claims',async()=>{
  const html=await renderPage('/',null);
  for(const value of ['data-homepage-v7','Your trading.','id="platform"','id="academy"','id="legacy"','href="/auth/register"','href="/auth/login"','labelled demonstration','Broker execution remains disabled','3 months of full access','Interface preview']) expect(html).toContain(value);
  expect(html?.match(/<h1\b/g)).toHaveLength(1);
  expect(html?.match(/<article class="v7-feature-card"/g)).toHaveLength(4);
  expect(html).not.toMatch(/guaranteed profit|MT5 Live|24,580|98% win/i);
  expect(html?.indexOf('id="platform"')).toBeLessThan(html?.indexOf('id="academy"')??0);
  expect(html).not.toContain('v4-hero-emblem.webp');
  expect(html).not.toContain('product-brand-scene');
  expect(html).not.toContain('v6-portal');
  expect(html).toContain('href="/assets/homepage-v7.css"');
  expect(html).toContain('src="/assets/homepage-v7.js"');
});

it('publishes only the named illustrative product images and scopes enhancements to the homepage',async()=>{
  for(const name of ['education-phone','settings','academy']){
    const asset=`product/${name}-preview.webp`;
    expect(safeAssetPath('/assets/'+asset)).toBe(asset);
    expect((await stat('apps/web/public/'+asset)).size).toBeGreaterThan(1000);
  }
  expect(safeAssetPath('/assets/product/private-client.webp')).toBeNull();
  for(const path of ['/app','/app/settings','/admin','/auth/login']){
    const html=await renderPage(path,{role:'ADMIN',name:'Example',email:'example@example.test'});
    expect(html).not.toContain('/assets/product-home.');
    expect(html).not.toContain('data-product-home');
  }
  const capture=await readFile('scripts/capture-launch-previews.mjs','utf8');
  expect(capture).toContain('ILLUSTRATIVE CONTENT');
  expect(capture).not.toContain('dotenv');
});
