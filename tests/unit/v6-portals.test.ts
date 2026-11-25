import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {isLaunchPathEnabled} from '../../apps/web/server/launch-policy.js';
import { renderPage, routes, safeAssetPath } from '../../apps/web/server/render.js';

const reviewer = { id: 'synthetic-v6-reviewer', name: 'Synthetic reviewer', email: 'v6-review@example.test', role: 'ADMIN' };

it('scopes the V6 portal shell and assets to authenticated workspaces', async () => {
  for (const [route] of routes) {
    const html = await renderPage(route, reviewer);
    if(!isLaunchPathEnabled(route)){expect(html,route).toBeNull();continue;}
    const privateRoute = route === '/app' || route.startsWith('/app/') || route === '/admin' || route.startsWith('/admin/');
    if (privateRoute) {
      expect(html, route).toContain('v6-portal');
      expect(html, route).toContain(route.startsWith('/admin') ? 'v6-admin' : 'v6-client');
      expect(html, route).toContain('href="/assets/v6.css"');
      expect(html, route).toContain('src="/assets/portal-v6.js"');
      expect(html, route).not.toContain('src="/assets/hero-motion.js"');
      expect(html, route).not.toContain('data-cinema-canvas');
    } else {
      expect(html, route).not.toContain('v6-portal');
      expect(html, route).not.toContain('/assets/v6.css');
      expect(html, route).not.toContain('/assets/portal-v6.js');
    }
  }
  expect(safeAssetPath('/assets/v6.css')).toBe('v6.css');
  expect(safeAssetPath('/assets/portal-v6.js')).toBe('portal-v6.js');
});

it('protects homepage files outside the approved logo and product homepage updates', async () => {
 const realEntry=JSON.parse(await readFile('docs/REAL_INDEX_ENTRY_BASELINE.json','utf8')) as Record<string,string>;
 expect(Object.keys(realEntry)).toEqual(['apps/web/pages/index.html']);
  const yenqo=JSON.parse(await readFile('docs/YENQO_REBRAND_BASELINE.json','utf8')) as Record<string,string>;
  const baseline = JSON.parse(await readFile('docs/V6_HOMEPAGE_BASELINE.json', 'utf8')) as Record<string, string>;
  const v7 = JSON.parse(await readFile('docs/V7_HOMEPAGE_BASELINE.json','utf8')) as Record<string,string>;
  expect(Object.keys(v7).sort()).toEqual(['apps/web/pages/demo-preview.html','apps/web/pages/index.html','rendered-public-homepage']);
  const launch = JSON.parse(await readFile('docs/LAUNCH_SCOPE_BASELINE.json','utf8')) as Record<string,string>;
  const membership = JSON.parse(await readFile('docs/MEMBERSHIP_APPROVED_BASELINE.json','utf8')) as Record<string,string>;
  expect(Object.keys(launch).sort()).toEqual(['apps/web/pages/demo-preview.html','apps/web/pages/index.html','apps/web/public/app.js','rendered-public-homepage']);
  const logoRefresh = JSON.parse(await readFile('docs/LOGO_REFRESH_BASELINE.json','utf8')) as Record<string,string>;
  const productRefresh = JSON.parse(await readFile('docs/PRODUCT_HOMEPAGE_BASELINE.json','utf8')) as Record<string,string>;
  expect(Object.keys(productRefresh).sort()).toEqual(['apps/web/pages/demo-preview.html','apps/web/pages/index.html','apps/web/public/hero-motion.js']);
  expect(Object.keys(logoRefresh).sort()).toEqual(['apps/web/pages/demo-preview.html','apps/web/pages/index.html','apps/web/public/hero-motion.js']);
  expect(Object.keys(baseline).length).toBeGreaterThan(10);
  for (const [file, expected] of Object.entries(baseline)) {
    const actual = createHash('sha256').update(await readFile(file)).digest('hex');
    expect(actual, file).toBe(yenqo[file] ?? (file==='apps/web/public/membership.js'?membership[file]:undefined) ?? realEntry[file] ?? v7[file] ?? launch[file] ?? productRefresh[file] ?? logoRefresh[file] ?? expected);
  }
});

it('retains honest trading availability and membership review hooks after restyling', async () => {
  const tools = await renderPage('/app/mt5', reviewer);
  expect(tools).toContain('Pairing coming soon');
  expect(tools).not.toContain('data-trade-action');
  expect(tools).not.toContain('data-v2-trade');
  const members = await renderPage('/admin/members', reviewer);
  expect(members).toContain('aria-label="Mobile admin navigation"');
  const mobileAdmin = members?.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0];
  expect(mobileAdmin).toContain('href="/admin/members"');
  expect(mobileAdmin).not.toContain('href="/app/mt5"');
  for (const hook of ['data-client-directory', 'data-client-list', 'data-membership-dialog', 'data-membership-reviews']) {
    expect(members).toContain(hook);
  }
  const dashboard = await renderPage('/app', reviewer);
  expect(dashboard).not.toContain('data-calendar-month');
  expect(dashboard).toContain('href="/app/calendar"');
  const calendar = await renderPage('/app/calendar', reviewer);
  expect(calendar).toContain('data-calendar-month');
  expect(calendar).toContain('data-calendar-days');
  expect(dashboard).not.toMatch(/MT5\s+Live|\+387\.65|24,580/);
});
