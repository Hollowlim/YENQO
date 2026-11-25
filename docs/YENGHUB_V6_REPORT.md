# YENGHUB V6 portal upgrade

Completed 26 October 2026. The existing plain HTML/CSS/JavaScript application and Node/Prisma backend are retained. This upgrade applies to the client and admin portals only.

## What changed

- Scoped obsidian, navy and champagne-gold portal styles, locally hosted Italiana display type, practical Outfit controls, official YENGFX logo, compact headers, responsive sidebars and keyboard workspace search.
- Client Dashboard: central XAUUSD TradingView workspace with fullscreen and provider failure/retry states; disconnected MT5 account panel; real published analysis and signal summaries; existing P/L calendar and unavailable performance states.
- Tools: preparation information and Coming soon for Beta 1. No broker commands were enabled.
- Private Mapping, Signals, Academy, Community, membership, settings and remaining existing screens inherit the portal design. Existing publishing, photo attachment, review and access hooks remain in use.
- Admin Control Tower: actual database counts, 7/30/90/365-day registration growth, current access distribution, recent members, recorded activity and narrowly described service status. No revenue is fabricated.
- Member directory: searchable account table, loaded-record filters/sorting, pagination, keyboard row selection and the existing approval/revocation dialog. Approval requires independently checked broker evidence; revocation requires a reason.
- Administrative logs: paginated, admin-only event index. Raw JSON details, secrets and private account snapshots are excluded.
- Profile saves now update displayed names and initials immediately. Search Escape and keyboard focus behavior were checked and corrected.

## Homepage protection

The 32 files in `V6_HOMEPAGE_BASELINE.json` remain byte-identical, including the homepage and demo-preview documents, shared existing CSS/JavaScript, cinematic assets and layout template. Portal additions are injected conditionally by `apps/web/server/render.js`. The homepage receives no V6 stylesheet or script.

## Files and architecture

| Area | Main files |
| --- | --- |
| Portal design | `apps/web/public/v6.css`, `portal-v6.js`, `fonts/italiana-regular.ttf` and its OFL license |
| Client dashboard | `apps/web/pages/member/overview.html`, `apps/web/public/client-portal.js` |
| Admin analytics | `apps/web/pages/admin/overview.html`, `apps/web/public/admin-portal.js`, `apps/web/server/admin-dashboard-routes.js` |
| Directory and profiles | `apps/web/pages/admin/members.html`, `apps/web/public/profiles.js` |
| Audit index | `apps/web/pages/admin/audit.html`, `apps/web/public/admin-audit.js`, `apps/web/server/admin-audit-routes.js` |
| Integration | `apps/web/server/render.js`, `index.js`, `scripts/export-preview.mjs` and regenerated private HTML exports |

No database schema migration is required by this redesign. Both new APIs check the authenticated administrator on the server, enforce rate limits and return bounded safe projections. An administrator still has no authority to trade a member's account.

## View the result

Start the normal configured application with `scripts\pnpm.cmd start`, then sign in through `http://127.0.0.1:3000/auth/login`. Client routes retain their existing membership rules; the admin portal is `/admin` and requires an administrator account.

For layout review without a running server, open `apps/web/pages/member/overview.html` or `apps/web/pages/admin/overview.html`. Their offline banner is intentional: these HTML files cannot authenticate or save private data. They contain no real client records.

Reviewed screenshots:

- [Authenticated desktop admin](screenshots/v6-auth-desktop-admin.png)
- [Authenticated desktop client](screenshots/v6-auth-desktop-client.png)
- [Authenticated phone admin](screenshots/v6-auth-phone-admin.png)
- [Authenticated phone client](screenshots/v6-auth-phone-client.png)

Authenticated screenshots show synthetic fixtures in an isolated local test database, not production members or market data. Chart requests were deliberately blocked in browser tests to verify the provider error/retry state deterministically.

## Verification

| Command | Outcome |
| --- | --- |
| `scripts\pnpm.cmd build` | Passed; 32 HTML screens exported, 36 HTML files validated |
| `scripts\pnpm.cmd lint` | Passed with zero warnings |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd test` | 52 tests passed in 14 files; includes homepage SHA-256 protection |
| `scripts\pnpm.cmd exec vitest run --config vitest.integration.config.ts` | 64 tests passed in 11 files |
| `scripts\pnpm.cmd exec playwright test --config playwright.portal.config.ts` | 10 tests passed; existing private screens checked at 1920, 1440, 1024, 834 and 390 pixels |
| `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` | 2 end-to-end flows passed, desktop and phone |
| `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts` | 14 homepage, fallback and responsive checks passed |

Integration and authenticated browser checks used a disposable native PostgreSQL instance on loopback and a separate test app origin. They did not mutate Supabase or deployment `.env` files. An initial PGlite socket adapter could not reliably multiplex Prisma transactions; switching the local runner to native PostgreSQL resolved those protocol errors. An invalid approval fixture also verified the existing database evidence constraint.

The authenticated browser flow covers minimal signup, password visibility, proceed-to-login, saving member details, free/pending access, admin data, audit index, searching and approving a member, protected Academy access, manual analysis/signal publication, dashboard summaries, reasoned revocation, retained free research access and logout. Responsive checks cover navigation, search keyboard behavior, notifications, calendar interaction, dialogs, overflow and offline API isolation. Reduced motion is respected; no cinematic scene runs behind private data panels.

## Practical limits

- MT5 cloud connectivity, broker positions and trade-history ingestion remain unimplemented. Tools is Coming soon; no trading interaction or successful broker action is claimed.
- Prices and chart tools are supplied by the external TradingView provider. Availability and delay depend on that provider. Automatic BOS/CHOCH, liquidity and structure overlays were not implemented here.
- P/L metrics and calendar values remain unavailable until genuine trade history exists. No synthetic performance is displayed as real.
- Admin metrics describe stored application records, not continuous infrastructure monitoring. Active members means a recorded sign-in within 30 days. The distribution uses existing IB/deposit access states rather than invented paid tiers.
- Directory search queries the database. Status filtering and sorting apply to the loaded page set and are labeled accordingly.
- Revenue, a billing integration, live support and outbound notification delivery were not added. Existing unsupported research/device/command screens remain explicitly unavailable or demonstrative.
- Tests do not establish live broker readiness, third-party uptime, real email delivery or production load capacity. Production deployment checks remain separate from these isolated beta checks.
