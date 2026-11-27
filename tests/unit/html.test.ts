import { expect, it } from 'vitest';
import { escapeHtml, interpolate, safeAssetPath, extractContent, renderPage } from '../../apps/web/server/render.js';
it('distinguishes actual client pages from labelled admin and offline simulations', async () => {
  const member = { id:'synthetic-client',role:'MEMBER',name:'Test',email:'test@example.test' };
  const client = await renderPage('/app/mt5',member);
  expect(client).toContain('data-client-view="true"');
  expect(client).not.toContain('Demo · not live');
  const admin = await renderPage('/app/mt5',{...member,role:'ADMIN'});
  expect(admin).toContain('data-client-view="false"');
  expect(admin).toContain('Demo · not live');
  const offline = await renderPage('/app/mt5',member,new URLSearchParams(),true);
  expect(offline).toContain('data-client-view="false"');
});

it('shows one flat client menu with Home first and account pages in their own group', async () => {
  const html = await renderPage('/app/mt5', { role: 'ADMIN', name: 'Test', email: 'test@example.test' });
  const main = html!.match(/<nav[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>/)?.[0] ?? '';
  expect([...main.matchAll(/<span>([^<]+)<\/span><\/a>/g)].map(m => m[1])).toEqual(['Home', 'Trading tools', 'Academy', 'P/L calendar', 'News', 'Discussion rooms']);
  const account = html!.match(/<nav[^>]*aria-label="Account navigation"[\s\S]*?<\/nav>/)?.[0] ?? '';
  for (const href of ['/app/settings', '/app/settings#broker-connection-heading', '/app/membership']) expect(account).toContain(`href="${href}"`);
  expect(html).not.toContain('yq-account-menu');
  for (const title of ['Strategy Lab', 'Backtesting', 'Market Analysis', 'Signals', 'Community', 'Journal']) expect(main + account).not.toContain(title);
});

it('extracts editable page content without trusting an offline shell as authenticated UI', () => {
  expect(extractContent('<html><body>offline profile<!-- PAGE CONTENT START --><h1>Screen</h1><!-- PAGE CONTENT END -->offline footer</body></html>')).toBe('<h1>Screen</h1>');
  expect(extractContent('<section>Existing fragment</section>')).toBe('<section>Existing fragment</section>');
  expect(extractContent('<html><!-- PAGE CONTENT START --><a href="signals.html" data-app-href="/app/signals">Signals</a><!-- PAGE CONTENT END --></html>')).toBe('<a href="/app/signals">Signals</a>');
});
it('restores the connected logo asset after standalone HTML has been exported', async () => {
  const html = await renderPage('/', null);
  expect(html).toContain('class="v7-brand"');
  expect(html).toContain('src="/assets/yenqo-mark.svg"');
  expect(html).toContain('rel="icon" href="/assets/yenqo-mark.svg"');
  expect(html).not.toMatch(/YENGFX|YENGHUB/);
  expect(html).not.toContain('src="../public/yengfx-mark-2026.webp"');
  expect(html).toContain('class="v7-window"');
  expect(html).not.toContain('src="../public/gallery-');
});
it('loads the V7 motion enhancement only on the public homepage without a WebGL bundle', async () => {
  const home = await renderPage('/',null);
  expect(home).toContain('YENQO — Your Trading. Your Control.');
  expect(home).not.toContain('src="/assets/cinematic-loader.js"');
  expect(home).toContain('src="/assets/homepage-v7.js"');
  expect(home).not.toContain('/assets/product-home.');
  expect(home).not.toContain('/assets/hero-art-renderer.js');
  expect(safeAssetPath('/assets/hero-motion.js')).toBe('hero-motion.js');
  expect(safeAssetPath('/assets/earth-renderer.js')).toBe('earth-renderer.js');
  expect(safeAssetPath('/assets/cinematic-scene.js')).toBe('cinematic-scene.js');
  for(const route of ['/app','/app/mt5','/app/strategy','/admin','/auth/login']) {
    const html = await renderPage(route,{role:'ADMIN',name:'Synthetic reviewer',email:'review@example.test'});
    expect(html).not.toContain('cinematic-scene.js');
    expect(html).not.toContain('cinematic-loader.js');
    expect(html).not.toContain('hero-motion.js');
    expect(html).not.toContain('data-cinema-canvas');
    expect(html).not.toContain('/assets/homepage-v7.');
  }
});
it('shows free calculators and disconnected MT5 without simulated trading controls',async()=>{
  for(const role of ['MEMBER','ADMIN']){
    const html=await renderPage('/app/mt5',{role,name:'Beta tester',email:'beta@example.test'});
    expect(html).toContain('Free XAUUSD calculators');
    expect(html).toContain('Pairing coming soon');
    expect(html).not.toContain('data-v2-trade');
    expect(html).not.toContain('data-trade-action');
  }
});
it('rejects a full HTML page without explicit content boundaries', () => {
  expect(() => extractContent('<!doctype html><html>broken export</html>')).toThrow('Missing page content markers');
});

it('escapes user text and attributes, without recursively interpolating it', () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & \'')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;');
  expect(interpolate('{{VALUE}} / {{OTHER}}', { VALUE: '{{OTHER}}', OTHER: '<strong>ok</strong>' })).toBe('{{OTHER}} / <strong>ok</strong>');
});
it('only permits published assets, never source, templates or traversal', () => {
  expect(safeAssetPath('/assets/app.js')).toBe('app.js');
  expect(safeAssetPath('/assets/styles.css')).toBe('styles.css');
  expect(safeAssetPath('/assets/shape-grid.js')).toBe('shape-grid.js');
  expect(safeAssetPath('/assets/yengfx-logo.png')).toBe('yengfx-logo.png');
  for (const path of ['/assets/../server/index.js', '/assets/%2e%2e/.env', '/server/index.js', '/pages/member/settings.html', '/assets/.env', '/assets/unknown.js']) expect(safeAssetPath(path)).toBeNull();
});
it('hides phone bar links a free member cannot open and labels admins honestly on Home', async () => {
  const free = { id:'synthetic-free', role:'MEMBER', name:'Test', email:'test@example.test', membership:null };
  const bar = (await renderPage('/app/mt5', free))!.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  expect(bar).not.toContain('href="/app"');
  for (const href of ['/app/mt5', '/app/news', '/app/rooms', '/app/settings']) expect(bar).toContain(`href="${href}"`);
  const adminHome = (await renderPage('/app', { ...free, role:'ADMIN' }))!;
  expect(adminHome).toContain('<strong>Administrator</strong>');
  expect(adminHome).not.toContain('class="yq-ok">Verified');
});
