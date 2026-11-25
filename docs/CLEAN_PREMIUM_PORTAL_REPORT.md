# Clean Premium Client + Admin refresh

31 October 2026, Asia/Kuala_Lumpur.

The authenticated portals now use the supplied concept's charcoal surfaces, neutral borders, precise typography, deliberate spacing and restrained champagne accents. The real application remains plain HTML/CSS/browser JavaScript with the existing Node/Prisma backend. The completed public homepage is unchanged.

## Reference and scope

Reviewed `E:\YENGFX HUB\YENGFX_Clean_Premium_Standalone.html`, the self-contained version of the reference. It contains navigable client/admin layouts and embedded imagery. [Client reference](screenshots/clean-portal/reference-client.png), [admin reference](screenshots/clean-portal/reference-admin.png), [mobile reference](screenshots/clean-portal/reference-mobile.png). The standalone was read and rendered for visual comparison; its application logic, sample chart, sample statuses and branding asset were not used as the live app.

The repository's established `yengfx-mark-2026.webp` remains the brand asset. No reference logo overwrote it, no extra framework was installed and no public/shared stylesheet was edited.

## Delivered changes

- **Separate private shell:** `apps/web/templates/portal-layout.html`, with a full-width application header, compact logo lockup, working search, notifications, profile photo, sidebar collapse and mobile menu. Authentication and the public page retain `templates/layout.html`.
- **Private navigation:** `portal-member-navigation.html` and `portal-admin-navigation.html`. Client links include Overview, Market Analysis, Trade Manager, Signals, Academy, Community, Journal, P/L Calendar, Membership and Settings, plus existing support access. Free-member links continue to be filtered by the server's existing entitlement policy. Admin Moderation goes to the existing Community moderator experience; System Status targets the existing admin service panel. No unsupported admin endpoints were invented.
- **Client overview:** `portal-member-overview.html` introduces three honest summary panels, retains the real external TradingView chart and retry/fullscreen behavior, and places a risk/preparation checklist beside it. Existing disconnected account details are accessible in an expandable section. Published analysis/signals summaries, quick destinations and the separate P/L Calendar remain available.
- **Admin overview:** `portal-admin-overview.html` prioritizes actual total members, verified access and pending reviews. Secondary activity/publishing metrics are expandable. Registration charts, membership distribution, recent members, audit activity, service status and publishing/moderation destinations retain their existing data hooks and authenticated API interfaces.
- **Scoped primitives:** `apps/web/public/portal-clean.css` defines private-only surfaces, typography, buttons, fields, source labels, responsive tables, dialogs, chat panels, profile cards and empty/error states. Decorative private-page artwork and profile tilting are suppressed. No cinematic renderer loads in the private shell.
- **Preserved behavior:** `render.js` chooses the private templates only for member/admin routes, keeps escaping and membership filtering, and publishes only the new stylesheet in the asset allowlist. The header identifies an administrator correctly when they use the existing Community moderation view; this changes no authorization. `portal-v6.js` search also recognizes existing route aliases such as “Tools.” `export-preview.mjs` resolves the new CSS and existing route fragments for local HTML views.

No authentication handlers, API permissions, database schema, broker commands, deposit rules or production environment files were changed. Administrator status does not authorize operations on a member's broker positions.

## Homepage preservation

`CLEAN_PORTAL_HOMEPAGE_BASELINE.json` records 18 protected files and the rendered guest homepage. Every hash matches the before state, including both public exports, public/shared templates/styles, the approved artwork and public animation scripts.

`CLEAN_PORTAL_HOMEPAGE_COMPARISON.json` records full-page pixel comparisons at **1440×1000**, **834×1112** and **390×844**. **Changed pixels: 0 at all three sizes.** Reduced motion and local assets make the comparison deterministic.

Git is unavailable and this checkout has no `.git` directory, so git diff could not be supplied. Exact source/render hashes and screenshot comparisons provide the preservation evidence instead. The baseline is not overwritten by the verification checks.

## Verification

Commands run from the repository root with `scripts\pnpm.cmd` and the bundled Node runtime:

| Command | Result |
| --- | --- |
| `scripts\pnpm.cmd build` | Passed; 34 HTML exports and 45 HTML templates/screens plus browser/server JavaScript validated |
| `scripts\pnpm.cmd lint` | Passed, zero warnings |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd test` | 57 unit tests passed in 17 files |
| `scripts\pnpm.cmd test:integration` | 68 integration tests passed in 12 files on disposable localhost PostgreSQL |
| `scripts\pnpm.cmd exec playwright test --config playwright.portal.config.ts --output .tools/clean-portal-results` | 10 portal route/navigation/calendar/modal checks passed across five viewport configurations |
| `scripts\pnpm.cmd exec playwright test --config playwright.clean.config.ts --output .tools/clean-focus-results` | 6 checks passed at 1440, 834 and 390: unique navigation, truthful source states, 44px header touch targets, search keyboard focus, dialogs, reduced-motion profile behavior and primary text contrast |
| `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` | 2 complete authenticated workflows passed: desktop and touch phone |
| `.\.tools\node-v24.22.0-win-x64\node.exe .tools/verify-clean-home.mjs` | 18 protected file hashes plus the rendered homepage hash matched |
| `.\.tools\node-v24.22.0-win-x64\node.exe .tools/compare-clean-home.mjs` | Zero changed homepage pixels at all three target widths |

Integration and authenticated browser checks explicitly used `127.0.0.1:5547` for PostgreSQL and `127.0.0.1:3117` for the test app, with the development email outbox enabled and external email credentials disabled. Ten existing migrations were already applied; no new migration was created. No test suite ran against hosted Supabase or real client records.

The full authenticated workflows cover minimal signup/login and password visibility, free membership routing, profile changes/photos, deposit verification request, admin search/approval, private access, genuine database-backed admin summaries, mapping/signals publication, member visibility, reason-required revocation, protected access removal and logout. Integration checks retain cross-member isolation, admin-role checks, CMS/lesson access, photo handling and other existing service protections. An overview link inherited from offline markup was caught by these tests and corrected to its real app route; regression coverage checks internal links.

## Visual review

- [Client desktop](screenshots/clean-portal/desktop-member-after.png), [client mobile](screenshots/clean-portal/mobile-member-after.png), [admin desktop](screenshots/clean-portal/desktop-admin-after.png).
- [Authenticated client](screenshots/v6-auth-desktop-client.png), [authenticated admin](screenshots/v6-auth-desktop-admin.png). These show **synthetic local test accounts and records**, not real members or production figures.
- Local UI entry points: `apps/web/pages/member/overview.html` and `apps/web/pages/admin/overview.html`. Offline previews remain clearly labelled. Real actions still require the running authenticated application.

## Limits retained

- Tools remains **Coming soon**. No secure MT5 cloud pairing/execution integration is enabled, and no broker order was sent.
- TradingView availability and any market-data delay remain provider-controlled. The blocked-network browser checks show the real retry/unavailable state rather than substitute prices or a fabricated chart.
- Journal is an existing preview route and does not store private journal entries on the server. Live support, payments and billing remain unavailable/unconfigured as previously implemented. The refresh does not claim to add these backends.
- This is a local repository implementation; no deployment was published. Keyboard/touch/contrast/reduced-motion checks are targeted verification, not a claim of a complete external accessibility audit.
