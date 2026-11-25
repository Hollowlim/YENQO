// Builds file:// previews from editable HTML. Never reads .env, sessions or the database.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, routes, escapeHtml } from '../apps/web/server/render.js';
import {isLaunchPathEnabled} from '../apps/web/server/launch-policy.js';

const pages = fileURLToPath(new URL('../apps/web/pages/', import.meta.url));
const assets = fileURLToPath(new URL('../apps/web/public/', import.meta.url));
const files = new Map([...routes].map(([route, [file]]) => [route, path.join(pages, `${file}.html`)]));
const relative = (from, to) => path.relative(path.dirname(from), to).split(path.sep).join('/');
const previewUser = { name: 'Client preview', email: 'preview@example.test', role: 'MEMBER', membership: { plan: 'FOUNDATION_DEMO', status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: 'offline-preview-only', verifiedAt: new Date(0) } };
const authNames = { login: 'Sign in', register: 'Create account', 'forgot-password': 'Forgot password', 'reset-password': 'Reset password' };

for (const [route] of routes) {
  if(!isLaunchPathEnabled(route))continue;
  // Launch variants retain the approved visual design while hiding deferred modules.
  const output = files.get(route);
  if (!output) throw new Error('Preview route is missing a file');
  const isAdmin = route.startsWith('/admin');
  let html = await renderPage(route, { ...previewUser, role: isAdmin ? 'ADMIN' : 'MEMBER', name: isAdmin ? 'Admin preview' : 'Client preview' }, new URLSearchParams(), true);
  if (!html) throw new Error('Preview route did not render');
  // The injected profile fragment ends with LF. Avoid accumulating that LF in
  // its editable export source on every build; keep private exports unchanged.
  if(['/app/settings','/admin/settings'].includes(route))html=html.replace(/(<section class="profile-photo-settings[\s\S]*?<\/section>)\n/,'$1');
  const home = relative(output, path.join(pages, 'demo-preview.html'));
  const categoryLinks = [...routes].filter(([href]) => isLaunchPathEnabled(href)&&!['/app/strategy','/app/backtesting'].includes(href) && !href.startsWith('/app/signals/')).map(([href, [screen, label]]) => {
    const name = screen.startsWith('auth/') ? authNames[screen.split('/')[1]]
      : screen.includes('signal-demo-') ? `Signal analysis / ${screen.split('signal-demo-')[1]}`
      : screen.includes('lesson-') ? `Lesson / ${screen.split('lesson-')[1].replaceAll('-', ' ')}`
      : label;
    return `<a href="${escapeHtml(relative(output, href === '/' ? path.join(pages,'demo-preview.html') : files.get(href)))}">${escapeHtml(name)}</a>`;
  }).join('\n');
  const client = escapeHtml(relative(output, files.get('/app')));
  const admin = escapeHtml(relative(output, files.get('/admin')));
  const banner = `<section class="offline-banner" aria-label="Offline preview information"><strong>OFFLINE UI PREVIEW${route.startsWith('/admin') ? ' / ADMIN VIEW' : route.startsWith('/app') ? ' / CLIENT VIEW' : ''}</strong><p>Preview the website design. No account is signed in; real client data and saving require the <a href="http://127.0.0.1:3000">local server</a>. MT5 trading is disabled.</p><nav class="preview-view-switch" aria-label="Preview view"><a href="${escapeHtml(home)}"${route === '/' ? ' aria-current="page"' : ''}>Homepage</a><a href="${client}"${route.startsWith('/app') ? ' aria-current="page"' : ''}>Client View</a><a href="${admin}"${isAdmin ? ' aria-current="page"' : ''}>Admin View</a></nav><div class="preview-actions"><details><summary>Explore all categories</summary><nav class="offline-catalog" aria-label="All demo screens">${categoryLinks}</nav></details></div></section>`;
  html = html.replace('<html lang="en">', '<html lang="en" data-offline-preview="true">')
    .replace('<div class="workspace">', `<div class="workspace">${banner}`)
    .replace('type="module" src="/assets/app.js"', 'defer src="/assets/app.js"')
    .replace('type="module" src="/assets/membership.js"', 'defer src="/assets/membership.js"')
    .replace('type="module" src="/assets/shape-grid.js"', 'defer src="/assets/shape-grid.js"')
    .replace('type="module" src="/assets/community.js"', 'defer src="/assets/community.js"')
    .replace('type="module" src="/assets/editorial.js"', 'defer src="/assets/editorial.js"')
    .replace('type="module" src="/assets/education.js"', 'defer src="/assets/education.js"')
    .replace('type="module" src="/assets/dashboard.js"', 'defer src="/assets/dashboard.js"')
    .replace('type="module" src="/assets/profiles.js"', 'defer src="/assets/profiles.js"')
    .replace(/\/assets\/(yenqo(?:-mark)?\.(?:css|svg)|terminal\.js|rooms\.js|news\.js|admin-platform\.js)/g,(_match,file)=>relative(output,path.join(assets,file)))
    .replace('/assets/styles.css', relative(output, path.join(assets, 'styles.css')))
    .replace('/assets/v2.css', relative(output, path.join(assets, 'v2.css')))
    .replace('/assets/v4.css', relative(output, path.join(assets, 'v4.css')))
    .replace('/assets/v6.css', relative(output, path.join(assets, 'v6.css')))
    .replace('/assets/portal-clean.css', relative(output, path.join(assets, 'portal-clean.css')))
    .replace('/assets/branding-2026.css', relative(output, path.join(assets, 'branding-2026.css')))
    .replace('/assets/product-home.css', relative(output, path.join(assets, 'product-home.css')))
    .replace('/assets/product-home.js', relative(output, path.join(assets, 'product-home.js')))
    .replace('/assets/homepage-v7.css', relative(output, path.join(assets, 'homepage-v7.css')))
    .replace('/assets/homepage-v7.js', relative(output, path.join(assets, 'homepage-v7.js')))
    .replace(/\/assets\/homepage-v7\/([a-z-]+\.webp)/g,(_match,file)=>relative(output,path.join(assets,'homepage-v7',file)))
    .replace(/src="\/assets\/product\/([a-z-]+\.webp)"/g, (_match,file)=>`src="${relative(output,path.join(assets,'product',file))}"`)
    .replaceAll('/assets/yengfx-mark-2026.webp', relative(output, path.join(assets, 'yengfx-mark-2026.webp')))
    .replace('/assets/portal-v6.js', relative(output, path.join(assets, 'portal-v6.js')))
    .replace('/assets/client-portal.js', relative(output, path.join(assets, 'client-portal.js')))
    .replace('/assets/admin-portal.js', relative(output, path.join(assets, 'admin-portal.js')))
    .replace('/assets/admin-audit.js', relative(output, path.join(assets, 'admin-audit.js')))
    .replace(/src="\/assets\/(v4-[a-z-]+\.webp)"/g, (_match,file)=>`src="${relative(output,path.join(assets,file))}"`)
    .replace('/assets/v2-trade-model.js', relative(output, path.join(assets, 'v2-trade-model.js')))
    .replace('/assets/v2.js', relative(output, path.join(assets, 'v2.js')))
    .replace('/assets/cinematic-scene.js', relative(output, path.join(assets, 'cinematic-scene.js')))
    .replace('/assets/cinematic-loader.js', relative(output, path.join(assets, 'cinematic-loader.js')))
    .replace('/assets/hero-motion.js', relative(output, path.join(assets, 'hero-motion.js')))
    .replace('/assets/v2-signals.js', relative(output, path.join(assets, 'v2-signals.js')))
    .replaceAll('/assets/yengfx-logo-v2.png', relative(output, path.join(assets, 'yengfx-logo-v2.png')))
    .replace('/assets/app.js', relative(output, path.join(assets, 'app.js')))
    .replace('/assets/membership.js', relative(output, path.join(assets, 'membership.js')))
    .replace('/assets/shape-grid.js', relative(output, path.join(assets, 'shape-grid.js')))
    .replace('/assets/community.js', relative(output, path.join(assets, 'community.js')))
    .replace('/assets/editorial.js', relative(output, path.join(assets, 'editorial.js')))
    .replace('/assets/education.js', relative(output, path.join(assets, 'education.js')))
    .replace('/assets/dashboard.js', relative(output, path.join(assets, 'dashboard.js')))
    .replace('/assets/account-settings.css', relative(output, path.join(assets, 'account-settings.css')))
    .replace('/assets/auth-clean.css', relative(output, path.join(assets, 'auth-clean.css')))
    .replace('/assets/pc-connection.js', relative(output, path.join(assets, 'pc-connection.js')))
    .replace('/assets/statement-import.js', relative(output, path.join(assets, 'statement-import.js')))
    .replace('/assets/broker-connection.js', relative(output, path.join(assets, 'broker-connection.js')))
    .replace('/assets/trading-tools.css', relative(output, path.join(assets, 'trading-tools.css')))
    .replace('/assets/trading-tools.js', relative(output, path.join(assets, 'trading-tools.js')))
    .replace('/assets/profiles.js', relative(output, path.join(assets, 'profiles.js')))
    .replace('/assets/profile-photo.js', relative(output, path.join(assets, 'profile-photo.js')))
    .replaceAll('/assets/yengfx-logo.png', relative(output, path.join(assets, 'yengfx-logo.png')))
    .replace(/src="\/assets\/(gallery-[a-z]+\.webp)"/g, (_match, file) => `src="${relative(output, path.join(assets, file))}"`)
    .replace(/href="(\/[^"]*)"/g, (match, href) => {
      const [route,fragment] = href.split('#');
      const target = route === '/' ? path.join(pages,'demo-preview.html') : files.get(route);
      return target ? `href="${escapeHtml(relative(output, target)+(fragment?'#'+fragment:''))}" data-app-href="${escapeHtml(href)}"` : match;
    });
  // The demo stays file-only. index.html is the real local-app entry point.
  if (route === '/') {
    await writeFile(path.join(pages, 'demo-preview.html'), html, 'utf8');
    const origin='http://127.0.0.1:3000';
    const launcher=`<section class="local-entry-panel" data-local-entry aria-label="Local application connection"><strong>YENQO · REAL ACCOUNT TESTING</strong><p data-local-entry-status role="status" aria-live="polite">Opening the running app. If it does not open, start the server with <code>scripts\\pnpm.cmd dev</code>.</p><p>Signup, login and portals use the running application and your actual account permissions.</p><nav aria-label="Local app entry"><button type="button" data-local-entry-retry>Retry connection</button><a href="${origin}/">Open website ↗</a><a href="${origin}/auth/register">Client signup</a><a href="${origin}/auth/login">Login</a><a href="${origin}/admin">Admin portal</a></nav></section>`;
    html=html.replace(banner,'')
      .replace(' data-offline-preview="true"','')
      .replace(/href="[^"]*"\s+data-app-href="(\/[^"]*)"/g,(_match,href)=>`href="${escapeHtml(origin+href)}"`)
      .replace('</head>',`<link rel="stylesheet" href="${relative(output,path.join(assets,'local-entry.css'))}"><script defer src="${relative(output,path.join(assets,'local-entry.js'))}"></script></head>`)
      .replace('<div class="workspace">','<div class="workspace">'+launcher);
  }
  await writeFile(output, html, 'utf8');
}
console.log(`Exported ${[...routes.keys()].filter(isLaunchPathEnabled).length} active HTML screens; deferred screens preserved. Open apps/web/pages/index.html directly in a browser.`);
