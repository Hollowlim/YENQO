import { readFile } from "node:fs/promises";
import { brokerConfigured } from "./broker-provider.js";
import { justMarketsServerSuggestions } from "./broker-servers.js";
import { NEWS_PROVIDERS } from "./news-routes.js";
import { createHash } from 'node:crypto';
import {isLaunchPathEnabled} from './launch-policy.js';
import {
  canViewMemberRoute,
  hasFullMemberAccess,
  memberDestination,
} from "./membership-policy.js";
const root = new URL("../", import.meta.url);

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
// Trusted HTML fragments only. User-controlled values must be escaped at the call site.
export const interpolate = (template, values) =>
  template.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) =>
    Object.hasOwn(values, name) ? values[name] : match,
  );
export function extractContent(html) {
  const startMarker = "<!-- PAGE CONTENT START -->";
  const endMarker = "<!-- PAGE CONTENT END -->";
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start >= 0 && end > start)
    return html
      .slice(start + startMarker.length, end)
      .replace(/href="[^"]*"\s+data-app-href="([^"]*)"/g, 'href="$1"')
      .replace(/src="(?:\.\.\/)+public\/([^"]+)"/g, 'src="/assets/$1"');
  if (/<html\b|<!doctype/i.test(html))
    throw new Error("Missing page content markers");
  return html;
}
export const safeAssetPath = (pathname) =>
  ({
    "/assets/app.js": "app.js",
    "/assets/membership.js": "membership.js",
    "/assets/shape-grid.js": "shape-grid.js",
    "/assets/community.js": "community.js",
    "/assets/editorial.js": "editorial.js",
    "/assets/education.js": "education.js",
    "/assets/dashboard.js": "dashboard.js",
    "/assets/account-settings.css": "account-settings.css",
    "/assets/broker-connection.js": "broker-connection.js",
    "/assets/trading-tools.js": "trading-tools.js",
    "/assets/trading-tools.css": "trading-tools.css",
    "/assets/statement-import.js": "statement-import.js",
    "/assets/pc-connection.js": "pc-connection.js",
    "/assets/auth-clean.css": "auth-clean.css",
    "/assets/profiles.js": "profiles.js",
    "/assets/profile-photo.js": "profile-photo.js",
    "/assets/portal-v6.js": "portal-v6.js",
    "/assets/client-portal.js": "client-portal.js",
    "/assets/admin-portal.js": "admin-portal.js",
    "/assets/admin-audit.js": "admin-audit.js",
    "/assets/v6.css": "v6.css",
    "/assets/portal-clean.css": "portal-clean.css",
    "/assets/branding-2026.css": "branding-2026.css",
    "/assets/product-home.css": "product-home.css",
    "/assets/product-home.js": "product-home.js",
    "/assets/homepage-v7.css": "homepage-v7.css",
    "/assets/homepage-v7.js": "homepage-v7.js",
    "/assets/homepage-v7/member-workspace.webp": "homepage-v7/member-workspace.webp",
    "/assets/homepage-v7/yenqo-workspace.webp": "homepage-v7/yenqo-workspace.webp",
    "/assets/homepage-v7/rock.webp": "homepage-v7/rock.webp",
    "/assets/homepage-v7/planet.webp": "homepage-v7/planet.webp",
    "/assets/product/mapping-preview.webp": "product/mapping-preview.webp",
    "/assets/product/signals-preview.webp": "product/signals-preview.webp",
    "/assets/product/academy-preview.webp": "product/academy-preview.webp",
    "/assets/product/community-preview.webp": "product/community-preview.webp",
    "/assets/product/education-phone-preview.webp": "product/education-phone-preview.webp",
    "/assets/product/settings-preview.webp": "product/settings-preview.webp",
    "/assets/yengfx-mark-2026.webp": "yengfx-mark-2026.webp",
    "/assets/v4-hero-emblem.webp": "v4-hero-emblem.webp",
    "/assets/yengfx-logo.png": "yengfx-logo.png",
    "/assets/gallery-tools.webp": "gallery-tools.webp",
    "/assets/gallery-analysis.webp": "gallery-analysis.webp",
    "/assets/gallery-education.webp": "gallery-education.webp",
    "/assets/fonts/manrope-variable.ttf": "fonts/manrope-variable.ttf",
    "/assets/fonts/outfit-variable.ttf": "fonts/outfit-variable.ttf",
    "/assets/fonts/italiana-regular.ttf": "fonts/italiana-regular.ttf",
    "/assets/styles.css": "styles.css",
    "/assets/v4.css": "v4.css",
    "/assets/v4-hero.webp": "v4-hero.webp",
    "/assets/v4-hero-premium.webp": "v4-hero-premium.webp",
    "/assets/v4-scene-background.webp": "v4-scene-background.webp",
    "/assets/v4-scene-starfield.webp": "v4-scene-starfield.webp",
    "/assets/v4-earth-texture.webp": "v4-earth-texture.webp",
    "/assets/v4-scene-logo.webp": "v4-scene-logo.webp",
    "/assets/v4-scene-rock.webp": "v4-scene-rock.webp",
    "/assets/v4-market.webp": "v4-market.webp",
    "/assets/v4-card-market.webp": "v4-card-market.webp",
    "/assets/v4-card-tools.webp": "v4-card-tools.webp",
    "/assets/v4-card-signals.webp": "v4-card-signals.webp",
    "/assets/v4-card-community.webp": "v4-card-community.webp",
    "/assets/v4-tools.webp": "v4-tools.webp",
    "/assets/v4-signals.webp": "v4-signals.webp",
    "/assets/v4-community.webp": "v4-community.webp",
    "/assets/v2.css": "v2.css",
    "/assets/v2.js": "v2.js",
    "/assets/cinematic-scene.js": "cinematic-scene.js",
    "/assets/cinematic-loader.js": "cinematic-loader.js",
    "/assets/hero-motion.js": "hero-motion.js",
    "/assets/hero-art-renderer.js": "hero-art-renderer.js",
    "/assets/earth-renderer.js": "earth-renderer.js",
    "/assets/v2-signals.js": "v2-signals.js",
    "/assets/v2-trade-model.js": "v2-trade-model.js",
    "/assets/yengfx-logo-v2.png": "yengfx-logo-v2.png",
    "/assets/yenqo-mark.svg": "yenqo-mark.svg",
    "/assets/yenqo.css": "yenqo.css",
    "/assets/terminal.js": "terminal.js",
    "/assets/rooms.js": "rooms.js",
    "/assets/news.js": "news.js",
    "/assets/admin-platform.js": "admin-platform.js",
  })[pathname] ?? null;

export const routes = new Map(
  /** @type {[string, string[]][]} */ ([
    ["/", ["index", "YENQO — Your Trading. Your Control."]],
    ...["login", "register", "forgot-password", "reset-password"].map(
      (mode) => [`/auth/${mode}`, [`auth/${mode}`, mode]],
    ),
    ...[
      ["", "overview", "Dashboard"],
      ["/mt5", "mt5", "Tools"],
      ["/rooms", "rooms", "Discussion Rooms"],
      ["/news", "news", "News"],
      ["/mt5/devices", "devices", "Device Setup"],
      ["/mt5/commands/example", "receipt", "Command Receipt"],
      ["/signals", "signals", "Signals"],
      ["/mapping", "mapping", "Daily Analysis / Mapping"],
      ["/community", "community", "Community"],
      ["/chat", "chat", "Live Chat / Demo"],
      ["/strategy", "strategy", "Strategy Lab"],
      ["/backtesting", "backtesting", "Backtesting"],
      ["/academy", "academy", "Educations"],
      ["/journal", "journal", "Journal"],
      ["/calendar", "calendar", "P/L Calendar"],
      ["/membership", "membership", "Membership"],
      ["/notifications", "notifications", "Notifications"],
      ["/settings", "settings", "Settings"],
      ...["demo-structure", "demo-support", "demo-review"].map((id) => [
        `/signals/${id}`,
        `signal-${id}`,
        "Signals",
      ]),
      ...["market-structure", "risk-and-discipline", "mentorship"].map((id) => [
        `/academy/${id}`,
        `lesson-${id}`,
        "Educations",
      ]),
    ].map(([route, file, title]) => [
      `/app${route}`,
      [`member/${file}`, title],
    ]),
    ...["", "signals", "mapping", "content", "members", "audit", "settings", "platform"].map(
      (section) => [
        `/admin${section ? "/" + section : ""}`,
        [
          `admin/${section || "overview"}`,
          section ? `Admin / ${section}` : "Administration",
        ],
      ],
    ),
  ]),
);

function highlightNavigation(html, pathname) {
  return html.replace(/<a\b[^>]*>/g, (tag) => {
    tag = tag
      .replace(/ aria-current="page"/g, "")
      .replace("nav-link selected", "nav-link");
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (
      !href ||
      (pathname !== href &&
        (["/app", "/admin"].includes(href) || !pathname.startsWith(href + "/")))
    )
      return tag;
    return tag
      .replace('class="nav-link"', 'class="nav-link selected"')
      .replace('class=""', 'class="active"')
      .replace(/^<a\b/, '<a aria-current="page"');
  });
}

export async function renderPage(
  pathname,
  user,
  searchParams = new URLSearchParams(),
  preserveBindings = false,
) {
  if(!isLaunchPathEnabled(pathname))return null;
  const page = routes.get(pathname);
  if (!page) return null;
  const [file, title] = page;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const privatePortal = pathname === '/app' || pathname.startsWith('/app/') || admin;
  const [layout, pageDocument, navigationTemplate] = await Promise.all([
    readFile(new URL(pathname === '/' ? 'templates/homepage-v7-layout.html' : privatePortal ? 'templates/portal-layout.html' : 'templates/layout.html', root), "utf8"),
    readFile(new URL(pathname === '/' ? 'templates/homepage-v7.html' : pathname==='/app/mt5' ? 'templates/trading-tools.html' : ['/app/settings','/admin/settings'].includes(pathname) ? 'templates/account-settings.html' : pathname==='/app/calendar' ? 'templates/performance-calendar.html' : ['/app','/admin'].includes(pathname) ? `templates/launch-${admin ? 'admin' : 'member'}-overview.html` : `pages/${file}.html`, root), "utf8"),
    readFile(
      new URL(`templates/${privatePortal ? 'portal-' : ''}${admin ? "admin" : "member"}-navigation.html`, root),
      "utf8",
    ),
  ]);
  let navigation = navigationTemplate;
  navigation=navigation.replace(/<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a\s*>/g,(tag,href)=>isLaunchPathEnabled(href)?tag:'');
  navigation = highlightNavigation(navigation, pathname);
  if (user && !admin && !hasFullMemberAccess(user))
    navigation = navigation.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, (link) => {
      const href = link.match(/href="([^"]+)"/)?.[1];
      return href && canViewMemberRoute(user, href) ? link : "";
    });
  if (user?.role === "ADMIN" && !admin)
    navigation = navigation.replace(
      "</nav>",
      '<a class="nav-link" href="/admin">Admin portal</a></nav>',
    );
  const logout =
    '<button class="logout" data-logout>Sign out</button><p data-logout-error role="alert" hidden></p>';
  const connection =
    '<div class="connection-mini"><span class="status-dot"></span><span>MT5 disconnected</span></div><small>Cloud connector pending / execution disabled</small>';
  const profile = user
    ? `${connection}<div class="profile"><span class="avatar">${escapeHtml(user.name.slice(0, 1))}</span><span><strong>${escapeHtml(user.name)}</strong><small>${admin ? "Administrator" : pathname.startsWith('/app') ? hasFullMemberAccess(user) ? "Verified IB member" : "Free member" : "Foundation member"}</small></span></div>${logout}`
    : `${connection}<a class="button button-gold" href="/auth/login">Member login →</a>`;
  let contentTemplate = extractContent(pageDocument);
  if (pathname === '/app/mt5') contentTemplate = (await readFile(new URL('templates/terminal.html', root), 'utf8')) + contentTemplate;
  if (pathname === '/admin/platform') contentTemplate = contentTemplate.replace('{{PLATFORM_STATUS}}', platformStatus());
  if(['/app/settings','/admin/settings'].includes(pathname)){
    contentTemplate=contentTemplate.replace('{{SETTINGS_ROLE}}',admin?'Administrator':hasFullMemberAccess(user)?'Verified IB member':'Free member')
      .replace('{{PROFILE_FORM_ATTR}}',admin?'data-admin-profile':'')
      .replace('{{BROKER_PROFILE_FIELDS}}',admin?'':'<div class="settings-subheading"><h3>Broker &amp; MT5 details</h3><p>These are your membership review details. They do not connect a broker by themselves.</p></div><label class="field">Broker<input name="brokerName" maxlength="60" placeholder="For example, JUSTMARKET" autocomplete="off"></label><label class="field">MT5 account number<input name="mt5Account" inputmode="numeric" pattern="[0-9]{4,20}" maxlength="20" placeholder="Your account number" autocomplete="off"></label><label class="field">MT5 server (optional)<input id="profile-mt5-server" name="mt5Server" maxlength="100" placeholder="Select or enter your exact server" autocomplete="off" list="mt5-server-suggestions" aria-describedby="mt5-server-help"></label><datalist id="mt5-server-suggestions"></datalist><p id="mt5-server-help" class="settings-note">JustMarkets suggestions appear automatically. Use the exact server shown on your MT5 account.</p>')
      .replace('{{SETTINGS_ACCESS_LINK}}',admin?'<p class="settings-note">Administrator access is controlled on the server. Profile changes do not change your role.</p>':'<a class="settings-inline-link" href="/app/membership">Manage membership <span aria-hidden="true">↗</span></a>')
      .replace('{{BROKER_SYNC_PANEL}}',admin?'':await readFile(new URL('templates/broker-connection.html',root),'utf8'));
  }
  if(pathname==='/app/calendar')contentTemplate=contentTemplate.replace('{{STATEMENT_IMPORT}}',await readFile(new URL('templates/metaapi-calendar.html',root),'utf8'));
  if(pathname==='/')contentTemplate=interpolate(contentTemplate,{COPYRIGHT_YEAR:new Intl.DateTimeFormat('en',{timeZone:'Asia/Kuala_Lumpur',year:'numeric'}).format(new Date())});
  if(pathname==='/app/membership')contentTemplate=contentTemplate.replace('Start with free signals. Unlock the member workspace after verified IB linkage and a qualifying deposit.','Start with your free member account. Unlock private education after verified IB linkage and a qualifying deposit.');
  if(pathname==='/app/membership')contentTemplate=contentTemplate.replace(/<section class="card plan-card pixel-plan">[\s\S]*?<\/section>/,'<section class="card plan-card pixel-plan"><span class="eyebrow">YOUR MEMBER ACCOUNT</span><h2>Free</h2><div class="plan-price">USD 0<span> / membership</span></div><p>Set up your account and submit your details for verification.</p><a class="button button-secondary" href="/app/settings">Account settings</a><ul class="plan-benefits"><li>Your member profile</li><li>Broker and MT5 account details</li><li>Membership verification request</li></ul></section>');
  if(pathname==='/app/membership'){
    contentTemplate=contentTemplate.replace('Start with your free member account. Unlock private education after verified IB linkage and a qualifying deposit.','Your membership status, IB verification and account access.');
    const hideOffers=!preserveBindings&&Boolean(user&&(user.role==='ADMIN'||hasFullMemberAccess(user)));
    contentTemplate=contentTemplate.replace(/<div class="membership-plans"[^>]*>/,tag=>tag.replace(/ hidden(?=[\s>])/g,'').replace(/>$/,hideOffers?' hidden>':'>'));
    contentTemplate=contentTemplate.replace(/<section id="membership-request"[^>]*>/,tag=>tag.replace(/ hidden(?=[\s>])/g,'').replace(/>$/,hideOffers?' hidden>':'>'));
    if(!preserveBindings&&user){
      const status=user.role==='ADMIN'?'ADMINISTRATOR':hasFullMemberAccess(user)?'APPROVED':user.membership?.status==='APPROVED'?'REVIEW REQUIRED':user.membership?.status??'FREE';
      contentTemplate=contentTemplate.replace(/(data-membership-status[^>]*>)[^<]*(<\/span>)/,`$1${escapeHtml(status)}$2`);
      contentTemplate=contentTemplate.replace(/(<p data-membership-summary>)[\s\S]*?(<\/p>)/,`$1${hideOffers?(user.role==='ADMIN'?'Administrator access is separate from IB membership.':'Full member access is approved. MT5 trading controls remain disabled.'):'Your membership details are being refreshed.'}$2`);
    }
  }
  const initial = user?.name?.slice(0,1) ?? 'M';
  const photoUrl = !preserveBindings && /^[a-f0-9]{64}$/.test(user?.profilePhoto?.imageHash ?? '') ? `/api/profile/photo?v=${user.profilePhoto.imageHash}` : '';
  const avatar = className => `<span class="${className}" data-profile-avatar data-profile-initial="${escapeHtml(initial)}"><span data-profile-initial>${escapeHtml(initial)}</span>${photoUrl ? `<img class="profile-avatar-image" src="${photoUrl}" alt="" data-own-profile-photo hidden>` : ''}</span>`;
  if (['/app/settings', '/admin/settings'].includes(pathname)) {
    const profileCard = await readFile(new URL('templates/profile-card.html', root), 'utf8');
    const personalizedCard = profileCard.replaceAll('{{PROFILE_NAME}}', escapeHtml(user?.name ?? 'Your profile')).replaceAll('{{PROFILE_ROLE}}', admin ? 'Administrator' : hasFullMemberAccess(user) ? 'Verified IB member' : 'Free member').replace('{{PROFILE_AVATAR}}', avatar('profile-card-portrait'));
    contentTemplate = contentTemplate.includes('{{PROFILE_CARD}}') ? contentTemplate.replace('{{PROFILE_CARD}}', personalizedCard) : contentTemplate.replace(/<section class="profile-photo-settings\b[\s\S]*?<\/section>/, personalizedCard);
  }
  let content = preserveBindings
    ? contentTemplate
    : interpolate(contentTemplate, {
        DISPLAY_NAME: escapeHtml(user?.name ?? ""),
        EMAIL: escapeHtml(user?.email ?? ""),
        PLAN:
          user?.membership?.plan === "FOUNDATION_DEMO"
            ? "Foundation demo"
            : "No active plan",
      });
  if (searchParams.get("notice") === "admin-required")
    content =
      '<p class="notice" role="status">Administrator access is required for that page. Your member workspace is available below.</p>' +
      content;
  if (
    pathname === "/app/membership" &&
    searchParams.get("notice") === "ib-required"
  )
    content =
      '<p class="notice" role="status">This feature requires verified JUSTMARKET IB membership and a qualifying deposit of at least USD 100.</p>' +
      content;
  let shell = highlightNavigation(layout, pathname);
  if(pathname.startsWith('/auth/'))shell=shell.replace('<body class="v2-theme"','<body class="v2-theme auth-page"').replace('</head>','<link rel="stylesheet" href="/assets/auth-clean.css"></head>');
  if(pathname!=='/')shell = shell.replace('</head>', '<link rel="stylesheet" href="/assets/branding-2026.css"></head>');
  const portal = privatePortal;
  if (portal) {
    // Keep all portal changes out of the public homepage and auth document.
    shell = shell.replace('class="v2-theme"', `class="v2-theme v6-portal clean-portal ${admin ? 'v6-admin' : 'v6-client'}"`)
      .replace('</head>', '<link rel="stylesheet" href="/assets/v6.css"><script defer src="/assets/portal-v6.js"></script><script defer src="/assets/profile-photo.js"></script></head>')
      .replace('<div class="shape-grid site-effects" data-shape-grid aria-hidden="true"><canvas class="shape-grid-canvas"></canvas></div>', '')
      .replace('<script type="module" src="/assets/shape-grid.js"></script>', '')
      .replace('</head>', '<link rel="stylesheet" href="/assets/portal-clean.css"></head>');
    const search = `<div class="v6-workspace-search"><label><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" data-portal-search aria-label="Find a workspace" aria-controls="portal-search-results" aria-expanded="false" placeholder="${admin ? 'Find an admin workspace…' : 'Find a workspace…'}" autocomplete="off"><kbd>Ctrl K</kbd></label><div id="portal-search-results" class="v6-search-results" data-portal-search-results hidden></div></div>`;
    shell = shell.replace('<span class="breadcrumb">{{BREADCRUMB}}</span>', search);
    const administrator = user?.role === 'ADMIN';
    const person = `<a class="v6-header-profile" aria-label="My profile" href="${administrator ? '/admin/settings' : '/app/settings'}">${avatar('v6-profile-avatar')}<span><strong>${escapeHtml(user?.name ?? 'Member')}</strong><small>${administrator ? 'Administrator' : hasFullMemberAccess(user) ? 'Verified IB member' : 'Free member'}</small></span></a>`;
    shell = shell.replace('<div class="topbar-actions">', '<div class="topbar-actions">' + person);
    if (pathname === '/admin') shell = shell.replace('</head>', '<script defer src="/assets/admin-portal.js"></script></head>');
    if (pathname === '/admin/audit') shell = shell.replace('</head>', '<script defer src="/assets/admin-audit.js"></script></head>');
    if (pathname === '/app') shell = shell.replace('</head>', '<script defer src="/assets/client-portal.js"></script></head>');
  }
  const clientView = Boolean(user && user.role !== 'ADMIN' && !preserveBindings);
  if (clientView) {
    shell = shell.replace('DEMO · NOT LIVE', 'EA DISCONNECTED');
    content = content.replace('aria-label="Local Trade Manager simulation"', 'aria-label="MT5 Trade Manager"');
    navigation = navigation.replaceAll('Live Chat / Demo', 'Live Chat');
    if (pathname === '/app/chat') content = '<div class="page-heading"><span class="eyebrow">YENQO / SUPPORT</span><h1>Live Chat</h1><p>Support messaging is not connected yet. Use Community to contact the team.</p></div><section class="card v2-panel"><h2>Support unavailable</h2><p>No live support room is available at this time.</p><a class="button button-gold section-gap" href="/app/community">Open Community</a></section>';
  }
  shell = shell.replaceAll('<strong>YENQO</strong>', '<img class="brand-logo-small" src="/assets/yenqo-mark.svg" alt="" width="36" height="36">');
  if (pathname === '/app/community') shell = shell.replace('</head>', '<script type="module" src="/assets/community.js"></script></head>');
  if (pathname === '/app/calendar') shell = shell.replace('</head>', '<script type="module" src="/assets/dashboard.js"></script></head>');
  if (['/app/settings', '/admin/settings', '/admin/members'].includes(pathname)) shell = shell.replace('</head>', '<script type="module" src="/assets/profiles.js"></script></head>');
  if(['/app/settings','/admin/settings','/app/calendar'].includes(pathname))shell=shell.replace('</head>','<link rel="stylesheet" href="/assets/account-settings.css"></head>');
  if(['/app/settings','/app/calendar'].includes(pathname))shell=shell.replace('</head>','<script defer src="/assets/statement-import.js"></script></head>');
  if(pathname==='/app/settings')shell=shell.replace('</head>','<script defer src="/assets/broker-connection.js"></script></head>');
  if(pathname==='/app/mt5')shell=shell.replace('</head>','<link rel="stylesheet" href="/assets/trading-tools.css"><script defer src="/assets/trading-tools.js"></script><script defer src="/assets/terminal.js"></script></head>');
  if(pathname==='/app/rooms')shell=shell.replace('</head>','<script defer src="/assets/rooms.js"></script></head>');
  if(pathname==='/app/news')shell=shell.replace('</head>','<script defer src="/assets/news.js"></script></head>');
  if(pathname==='/admin/platform')shell=shell.replace('</head>','<script defer src="/assets/admin-platform.js"></script></head>');
  if (['/app/academy', '/admin/content'].includes(pathname)) shell = shell.replace('</head>', '<script type="module" src="/assets/education.js"></script></head>');
  if (['/app/mapping', '/app/signals', '/admin/mapping', '/admin/signals'].includes(pathname)) shell = shell.replace('</head>', '<script type="module" src="/assets/editorial.js"></script></head>');
  if (admin) shell = shell.replace(
    /<nav class="bottom-nav"[\s\S]*?<\/nav>/,
    '<nav class="bottom-nav" aria-label="Mobile admin navigation"><a href="/admin">Overview</a><a href="/admin/members">Members</a><a href="/admin/mapping">Mapping CMS</a><a href="/admin/signals">Signals CMS</a><a href="/admin/content">Academy CMS</a><a href="/admin/platform">Platform</a></nav>',
  );
  shell=shell.replace(/<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a\s*>/g,(tag,href)=>isLaunchPathEnabled(href)?tag:'');
  content=content.replace(/<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a\s*>/g,(tag,href)=>isLaunchPathEnabled(href)?tag:'');
  if(pathname==='/app/chat'&&clientView)content='<div class="page-heading"><span class="eyebrow">YENQO / SUPPORT</span><h1>Live Chat</h1><p>Live support is not connected for this release.</p></div><section class="card"><h2>Account support</h2><p>Review your account details and membership status in your portal.</p><a class="button button-secondary" href="/app/membership">Open Membership</a></section>';
  if(pathname==='/')shell=shell.replace('Your YENQO member workspace for XAUUSD daily analysis, manual signals, video education and community. Explore the app and create a free account.','Your YENQO workspace for private video education, membership verification and account settings. Create a free member account.');
  shell = shell.replace('</head>', '<link rel="icon" href="/assets/yenqo-mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/yenqo.css"></head>');
  let html=interpolate(shell, {
    PORTAL_LABEL: admin ? 'ADMINISTRATION' : 'MEMBER WORKSPACE',
    CLIENT_VIEW: String(clientView),
    DEMO_SCOPE: createHash('sha256').update(String(user?.id ?? 'offline-preview')).digest('hex').slice(0,24),
    TITLE: escapeHtml(title),
    COPYRIGHT_YEAR: new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(new Date()),
    BREADCRUMB: `YENQO / ${escapeHtml(title.toUpperCase())}`,
    CONTENT: content,
    NAVIGATION: navigation,
    PROFILE: portal ? profile.replace(/<span class="avatar">[\s\S]*?<\/span>/, avatar('avatar')) : profile,
    COMPACT_PROFILE: user
      ? logout
      : '<a class="nav-link" href="/auth/login">Member login</a>',
  });
  if(pathname==='/'&&user&&!preserveBindings){
    const destination=memberDestination(user);
    const portalLabel=user.role==='ADMIN'?'Admin portal':'My portal';
    html=html.replace(/<a\b([^>]*?)href="\/auth\/(login|register)"([^>]*)>[\s\S]*?<\/a>/g,(_match,before,_mode,after)=>`<a${before}href="${destination}"${after}>${portalLabel}</a>`);
    html=html.replace(/href="\/app"/g,`href="${destination}"`);
    html=html.replace(/Get started(?= <span aria-hidden="true">)/g,'Open portal');
  }
  return html;
}

// Server-side truth only: these rows describe configuration, never a live broker state.
function platformStatus() {
  const newsProvider = process.env.NEWS_PROVIDER ?? '';
  const rows = [
    ['EA execution', 'Disabled', 'Commands are validated, audited and rejected. No broker orders can be placed.', 'off'],
    ['Cloud MT5 connector', 'Not deployed', 'Managed terminal hosting is pending. See docs/YENQO_CLOUD_MT5_ARCHITECTURE.md.', 'pending'],
    ['Read-only MT5 history (MetaApi)', brokerConfigured() ? 'Configured' : 'Not configured', 'Investor-password history sync for the P/L Calendar.', brokerConfigured() ? 'ok' : 'pending'],
    ['News provider', newsProvider ? (Object.hasOwn(NEWS_PROVIDERS, newsProvider) ? `Configured: ${newsProvider}` : `Unknown: ${newsProvider}`) : 'Not configured', 'Members see an unavailable state and the Forex Factory reference link until a licensed provider is configured.', newsProvider && Object.hasOwn(NEWS_PROVIDERS, newsProvider) ? 'ok' : 'pending'],
    ['Broker compatibility', `JustMarkets reference list (${justMarketsServerSuggestions.length} servers)`, 'Other brokers need a compatibility record before onboarding.', 'pending'],
    ['EA licensing', 'Not implemented', 'No licence or availability records exist yet.', 'off'],
    ['Support requests', 'Not implemented', 'No support inbox exists yet.', 'off'],
  ];
  return `<table class="yq-table"><thead><tr><th scope="col">Component</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead><tbody>${rows.map(([name, state, note, tone]) => `<tr><th scope="row">${escapeHtml(name)}</th><td><span class="yq-pill yq-pill-${tone}">${escapeHtml(state)}</span></td><td>${escapeHtml(note)}</td></tr>`).join('')}</tbody></table>`;
}

export function errorPage(status) {
  const title = status === 404 ? "Page not found" : "Workspace unavailable";
  const message =
    status === 404
      ? "This page is not part of the foundation."
      : "Check the local database and try again. Your access remains protected.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | YENQO</title><link rel="icon" href="/assets/yenqo-mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/yenqo.css"><script type="module" src="/assets/shape-grid.js"></script></head><body><div class="shape-grid site-effects" data-shape-grid aria-hidden="true"><canvas class="shape-grid-canvas"></canvas></div><main class="standalone"><h1>${title}</h1><p>${message}</p><a class="button button-gold" href="/">Back to home</a></main></body></html>`;
}
