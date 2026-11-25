# Clean Premium Client/Admin refresh — inspection and plan

31 October 2026, Asia/Kuala_Lumpur. Implemented after locating and reviewing `E:\YENGFX HUB\YENGFX_Clean_Premium_Standalone.html`, a self-contained version of the supplied concept. See [the delivery and verification report](CLEAN_PREMIUM_PORTAL_REPORT.md). This document records the original repository inspection and file-by-file plan.

## Actual application

- Native Node HTTP application, plain HTML/CSS/browser JavaScript, Prisma/PostgreSQL. Do not replace it with the reference's standalone application.
- `apps/web/server/index.js` authenticates private page requests with `currentUser`, rejects non-admin access to `/admin`, and applies the existing member route entitlement policy. `auth.js` resolves hashed session tokens and expiry from the database.
- `render.js` owns the route map, renders shared templates, scopes `v6.css` and portal scripts to private routes, and escapes user data. Public `/` reads `templates/product-home.html` through the original layout.
- The client overview reads `/api/content/analysis` and `/api/content/signals` using `client-portal.js`. Its external OANDA:XAUUSD chart is supplied by TradingView; provider availability/delay is not proof of a live broker connection.
- Admin summaries use `/api/admin/dashboard`; audit uses `/api/admin/audit`. These check authenticated admin role. Member directory uses `/api/admin/clients` with admin authorization and an audit event.
- Own profile writes are scoped to the authenticated user, versioned, audited and protected by the existing origin/CSRF/rate-limit checks. Broker-detail changes invalidate prior membership verification. Keep this behavior.
- Existing publishing, private MP4 video, community reports/moderation, membership approval/revocation and profile photo operations retain their existing services. Admin access confers no broker trading authority.

## Supported navigation

Client: `/app` overview, `/app/mapping`, `/app/mt5`, `/app/signals`, `/app/academy`, `/app/community`, `/app/journal`, `/app/calendar`, `/app/membership`, `/app/settings`, plus existing notifications/support destinations. Presence of a route is not evidence of a completed backend: retain honest empty, prototype or unavailable states and existing entitlement checks. Tools is Coming soon; trading is disabled.

Admin: `/admin`, `/admin/members`, `/admin/content`, `/admin/signals`, `/admin/mapping`, `/admin/audit`, `/admin/settings`. Moderation is supported inside the existing `/app/community` administrator experience; System Status is a panel of `/admin`. Do not invent `/admin/moderation` or `/admin/system` services or payment/revenue feeds.

## File-by-file implementation plan

1. **New `apps/web/templates/portal-layout.html`**: private-only semantic shell with compact brand/header, desktop sidebar, accessible compact navigation and the existing profile, search, notification, collapse, logout and error hooks. Preserve the original `templates/layout.html` for the public homepage/authentication.
2. **New private client/admin navigation templates**: supported destinations and calm hierarchy. Preserve membership restrictions. Keep the established `yengfx-mark-2026.webp` asset; the preview symbol is a reference only.
3. **New `apps/web/public/portal-clean.css`**: scoped tokens, typography, surfaces, spacing, restrained active states and reusable buttons, form fields, tables, source labels, empty/loading/error states and dialogs. Reflow at 1440/834/390; honor touch, keyboard focus and reduced motion. Avoid global public/auth styling.
4. **Private overview content**: restructure the client market workspace and the denser administrator operational dashboard to the supplied reference hierarchy after inspecting it. Retain `data-client-*`, `data-admin-*`, chart and API hooks. No example chart prices, metrics, courses, testimonials or successful broker states are promoted to live data.
5. **`apps/web/server/render.js`**: select the new shell/navigation/styles only for private routes. Preserve escaping, route access rules, content extraction, role-aware profile rendering and membership dialogs. Keep auth handlers, ownership checks, validators and API contracts intact.
6. **`scripts/export-preview.mjs`**: resolve any new private assets for offline views; preserve both public entry documents exactly. Offline previews remain labelled and do not fetch private data.
7. **Tests and report**: scoped asset/render tests, route and menu smoke checks, modal/keyboard/touch/reduced-motion checks, authenticated client/admin workflows and relevant local integration checks. Use a disposable local database only; never run mutating tests against Supabase. Run build, lint, typecheck and unit tests. Compare homepage hashes and screenshots to the captured baseline. Record precise outcomes and limitations.

## Homepage preservation baseline

Captured using `.\.tools\node-v24.22.0-win-x64\node.exe .tools/clean-portal-baseline.mjs` (passed). The helper does not read `.env`, access the database or create sessions.

- `docs/CLEAN_PORTAL_HOMEPAGE_BASELINE.json`: hashes of the two public exports, public/shared template sources, shared/public styles, motion scripts and approved artwork, plus the rendered guest homepage.
- `docs/screenshots/clean-portal/`: full-page before screenshots of public, client and admin pages at 1440, 834 and 390 pixels using reduced motion and blocked external requests. Private screenshots contain only the existing offline preview state.

Git is not installed in this execution environment and the checkout has no `.git` directory. A git diff is therefore unavailable; use the exact source/render hash comparison and deterministic screenshot comparison instead. No production source, private UI, credentials, database or public homepage was changed during inspection.

## Required reference

The reference was found as `E:\YENGFX HUB\YENGFX_Clean_Premium_Standalone.html`. It embeds its logo and provides the client/admin concept without a separate assets folder. Native browser captures of its client, admin and mobile views are saved under `docs/screenshots/clean-portal/reference-*.png`. Its prototype authentication, fake chart and local-only sample content were not imported into the working app.
