import { expect, it } from 'vitest';
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
it('delivers actual HTML and plain JavaScript without React or Next.js assets', async () => {
  const response = await fetch(base);
  const html = await response.text();
  expect(html).toContain('/assets/homepage-v7.js');
  expect(html).toContain('/assets/homepage-v7.css');
  expect(html).not.toContain('/assets/hero-art-renderer.js');
  for(const asset of ['homepage-v7.css','homepage-v7.js','homepage-v7/rock.webp','homepage-v7/planet.webp','homepage-v7/member-workspace.webp']){
    const assetResponse=await fetch(base+'/assets/'+asset);
    expect(assetResponse.status,asset).toBe(200);
    expect(assetResponse.headers.get('content-type'),asset).toContain(asset.endsWith('.webp')?'image/webp':asset.endsWith('.css')?'text/css':'text/javascript');
  }
  expect(html).not.toMatch(/_next\/|self\.__next|__NEXT_DATA__|react-dom/);
  expect(response.headers.get('content-security-policy')).toContain("script-src 'self';");
  expect(response.headers.get('content-security-policy')).not.toContain('unsafe-inline');
  const js = await fetch(`${base}/assets/app.js`);
  expect(js.status).toBe(200);
  expect(js.headers.get('content-type')).toContain('javascript');
});
it('denies private HTML files, environment files and backend source through static URLs', async () => {
  for (const route of ['/pages/member/settings.html','/templates/layout.html','/server/auth-routes.js','/.env','/assets/.env','/assets/%2e%2e/server/index.js','/lib/security.ts']) {
    expect((await fetch(`${base}${route}`)).status, route).toBe(404);
  }
});
