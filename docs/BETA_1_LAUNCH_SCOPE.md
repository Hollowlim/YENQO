# Beta 1 launch scope

31 October 2026. This release follows the owner's request to defer Market Analysis / Mapping, Signals and in-app Community. It supersedes the older module availability descriptions in the historical implementation reports. No deployment or hosted database mutation was performed.

## Current member experience

- Signup remains display name, email and password, followed by login. Free members now land on **Membership**. Their own profile, photo, broker/MT5 details and verification request remain available.
- Verified IB + qualifying USD 100 members retain the overview, private Academy, P/L Calendar, Journal and other existing account destinations. Existing entitlements remain enforced on the server. Journal/history, notifications and support keep their existing honest prototype, empty or unavailable states; this change does not add integrations to them.
- The overview emphasizes Academy, Membership, Settings and Tools availability. It no longer requests analysis/signals or embeds the market workspace chart.
- Tools remains **Coming soon**. There is no enabled MT5 execution, pairing service or live trading account feed.
- Market Analysis, Signals and Community disappear from client/admin navigation, search sources, mobile shortcuts, overview actions and the offline screen catalog. Their direct HTTP page and API paths return **404**, including for an administrator. Nested signal pages and community media/actions are covered.
- Admin retains the real member directory, review dialog, approval/revocation, Academy CMS, audit and system status. Historical audit records are preserved.
- The owner will handle Telegram community promotion separately. No Telegram community button or invented group link has been added.

## Files and preservation

| File | Change |
| --- | --- |
| `apps/web/server/launch-policy.js` | Central release policy for deferred pages and API namespaces. |
| `apps/web/server/index.js` | Rejects deferred paths before dispatching data reads or mutations. |
| `apps/web/server/membership-policy.js` | Rejects deferred member pages; changes free-member landing to Membership. |
| `apps/web/public/app.js` | Updates the browser's login redirect allowlist and fallback to match the server. |
| `apps/web/server/render.js` | Filters navigation/actions and selects the release-specific templates; updates Free membership and unavailable support copy. |
| `apps/web/templates/launch-home.html` | Existing homepage design, art, logo and animations retained; launch copy/features now describe education, membership and account settings. |
| `apps/web/templates/launch-member-overview.html` | Learning/account overview without the deferred content/chart panels. |
| `apps/web/templates/launch-admin-overview.html` | Member and Academy operations without deferred CMS/moderation cards. |
| `apps/web/server/admin-dashboard-routes.js` | Replaces the unavailable support instruction that previously pointed to in-app Community. |
| `scripts/export-preview.mjs` | Exports 26 active route screens and excludes deferred links from the catalog. Archived HTML screens remain on disk. |
| `scripts/capture-launch-previews.mjs` | Captures two native, explicitly illustrative Academy/account phone images without customer data, environment files or database access. |

No schema migration, row deletion or production data access is needed. The original publishing/community controllers, Prisma models, HTML screens and prior homepage/overview templates are retained. Restoring a module later requires reviewing the release policy, restoring the intended overview/promotional templates and rerunning its HTTP/UI checks; changing a boolean alone does not rewrite the release-specific copy.

The older `product-home.html` is retained as the approved full-product design source. The current public homepage comes from `launch-home.html`; the active overviews similarly use `launch-*-overview.html`. Run `scripts\pnpm.cmd build` after source changes. Generated `pages/index.html` and `pages/demo-preview.html` are offline previews, not authenticated sessions or deployment packages.

## Verification

All commands below ran using bundled Node 24.22.0 and the repository's pnpm wrapper. Database tests used only disposable PostgreSQL at `127.0.0.1:5547` and the test app at `127.0.0.1:3117`; fixture users were removed by the tests. Production Supabase data and credentials were not used.

| Command | Outcome |
| --- | --- |
| `scripts\pnpm.cmd lint` | Passed, zero warnings. |
| `scripts\pnpm.cmd typecheck` | Passed, web and test TypeScript checks. |
| `scripts\pnpm.cmd test` | 61 tests passed across 18 files. |
| `scripts\pnpm.cmd test:integration` | 69 tests passed across 13 files. Includes real HTTP launch gates and existing auth, ownership, verification, profiles, videos and audit tests. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.clean.config.ts` | 6 checks passed at 1440 desktop, 834 tablet and 390 touch mobile, including keyboard, dialogs, contrast and reduced motion. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.portal.config.ts` | 10 checks passed across five viewports, covering every active private export and navigation/search/calendar interactions. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.v6-auth.config.ts` | 2 complete desktop/phone flows passed: signup/login, profile/photo persistence, verification request, admin directory/review, approval, protected Academy, launch page/API denial for both roles, revocation and logout. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.cinematic.config.ts` | 35 checks passed across seven viewports; public feature tabs, phone motion, no-JavaScript content, hero shader fallback and reduced motion. |
| `scripts\pnpm.cmd build` | Passed; 26 active screen exports, 48 HTML files validated. |

Deferred controller regression suites now call their preserved handlers directly against the local database. This retains checks for ownership, authorization, idempotency, moderation and publishing validation without enabling HTTP access. Separate HTTP integration tests and authenticated browser checks confirm the release server returns 404 for these endpoints, including POSTs.

A stale browser login redirect discovered during testing was corrected; server-only checks had correctly returned Membership, but the browser still fell back to Mapping. The homepage GPU pause test now waits for queued rendering frames to settle before asserting a stable frame phase.

`LAUNCH_SCOPE_BASELINE.json` records the intentional release changes to the two generated public HTML entries, rendered homepage, and nonvisual login script. Existing original baselines are retained. The other protected homepage source, styling, motion bundles, artwork and logo hashes still match. No Git executable/repository metadata was available here; this is a hash-based preservation check, not a Git diff or a claim of identical homepage pixels after the requested launch content changes.

## Preview and remaining launch work

Open `apps/web/pages/index.html` for the public offline preview or `demo-preview.html` to use the explicit preview switcher. Real users sign in through the running HTTP server. The updated member/admin screenshots are in `docs/screenshots/v6-auth-{desktop,phone}-{client,admin}.png`; these show synthetic test accounts only.

This work narrows and tests the release; it does not deploy it, register a domain, configure HTTPS/hosting, test production email delivery or backups, upload the owner's lessons, or connect an MT5 EA. Those operational steps and the actual published education content still need checking for the chosen production environment before inviting users.
