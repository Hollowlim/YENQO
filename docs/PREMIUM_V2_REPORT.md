# YENGFX HUB Premium V2 delivery

The existing application has been upgraded in place. Its Node HTTP server, plain HTML/CSS/JavaScript, custom secure authentication, Prisma/Supabase database, migrations and working CMS remain. No database schema migration, real membership decision, real broker operation or replacement database was performed for this upgrade.

Tools now opens directly to the labelled synthetic TP/SL/control preview, without a separate Start button. No EA command endpoint is enabled.

Client presentation update: actual signed-in MEMBER accounts now see disconnected Tools with unavailable metrics and disabled controls, without synthetic rows or a simulation badge. Optional local signal, learning, social and preference demonstrations are removed from their view, and support chat shows unavailable messaging instead of fictional conversations. Explicit admin/design previews retain labelled simulations. No broker connection is implied by removing client-facing sample data.

Latest layout adjustment: the member dashboard again opens directly to the performance cards and P/L calendar. Strategy Lab and Backtesting have been removed from member navigation and the offline category list. Their draft files remain archived in the project; they are not shown as client workspace choices.

## Open and run

Open **http://127.0.0.1:3000** for actual registration/login and private portals. `scripts\pnpm.cmd start` uses the configured private `.env` connection. Keep `.env` and `.env.supabase` private.

For offline design review, open `apps/web/pages/index.html`. The top Homepage / Client View / Admin View links browse 32 self-contained HTML screens. Offline admin screens are fictional previews, never authorization. Offline private APIs are disabled. V2 local simulations work without a server.

After shared templates change, run `scripts\pnpm.cmd build` to regenerate previews. Edit content between PAGE CONTENT markers; do not rerun the one-time page upgrade script on edited documents. Pre-upgrade HTML backups are in ignored `.tools/v1-before-v2/`.

## Reference and implementation

- Inspected the supplied V2 ZIP, handoff, HTML, CSS, JavaScript, logo and desktop/mobile/tablet screenshots; retained them under `docs/reference/v2/`.
- Read Figma MT5 node `9:160` using design context plus screenshot. Adapted charcoal/obsidian/gold, compact controls, card hierarchy and responsive layouts to the more recent V2 prototype and user requirements rather than copying fixed positioning or React/Tailwind code.
- Preserved the custom homepage accordion and generated artwork, Pixel membership cards, sign-up/login redirect and password visibility controls.
- Added centralized V2 tokens/styles in `apps/web/public/v2.css`, supplied V2 logo, collapsible desktop sidebar, real navigation and local demo support/research modules.

## Working behavior

| Area | What works | Data boundary |
| --- | --- | --- |
| Dashboard | Performance cards and the P/L calendar shown directly; month navigation, date details and Today control | No fabricated trade history, P/L or win rate |
| Trade Manager | Immediately visible simulation controls, BUY/SELL scope and average entry, example layers, BE/BE+2/custom buffer, secure25/50/75/90, de-risk, trim, cutSL, cancel pending, exact-price/pip TP-SL, clear, position close, reset, preview expiry, receipts and simulated pending/completed/rejected/failed | In-memory synthetic account; no execution requests or broker ACK |
| Close All | Pointer/keyboard 1.2-second hold, outside/blur/cancel cleanup, second confirmation, revision/expiry checks and repeat prevention | Synthetic positions only |
| Signals | Existing admin publishing/edit/archive and actual published client records; separate opt-in examples with active/pending/closed filters, local favorites and demo revision history | Real CMS is never replaced by fake levels; demo prices prominently labelled |
| Academy | Existing private MP4 playback and admin upload/publishing; local study path cards, lesson links and completion progress | Actual videos stay private; demo progress is browser-only |
| Community | Actual authenticated posts, replies, image attachments, reports and moderation; FREE members can now post; separate local social-feed examples with filters, likes/comments | Real stored Community remains distinct from browser demos |
| Support chat | Mentor Desk, Legacy Lounge, EA Support and Community-room demos, timestamps, local composer state, file-name attachment previews and per-room message persistence | No online mentor, live delivery or actual file upload claimed |
| Research | Strategy name/version, HTF/LTF, written rules and exit/invalidation drafts; backtest dates/cost/source assumptions | Browser drafts only; no verified backtest, curve, win rate or profit factor |
| Admin Studio | Existing real clients, approval/revoke dialog, mapping/signals/video CMS, audit routes and moderation; local mentorship announcement draft | Actual routes stay ADMIN-protected; no authority to trade user accounts |
| Settings | Existing profile/security/logout; local notification preferences and notification route | Telegram linking, EA pairing and push delivery remain unconnected |

Browser demo storage is namespaced by a server-derived opaque principal scope. Offline previews use a separate fictional scope. Storage contains only user-entered demo drafts/messages/progress; no session, broker password, API secret or real command credentials. It is not encrypted: use synthetic content on shared devices. Blocked storage falls back to temporary state with visible feedback.

## Verification

All fixture tests used the isolated local PostgreSQL-compatible development database at port 5433 and app port 3001. No destructive tests targeted hosted client data.

- `scripts\pnpm.cmd test`: **41 passed** across 11 files, including volume rounding, BUY/SELL order, invalid prices, stale/duplicate confirmation, scoped targets and no broker ACK.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/with-local-database.mjs integration`: **58 passed** across nine files. Covers real auth/ownership, membership, CMS, video and Community/photo boundaries, including Free and revoked-member regular Community posting.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/with-local-database.mjs browser --v2`: **24 passed** across desktop1440, tablet834 and mobile390. Covers the homepage gallery, signup/password visibility, approval/revocation, actual Community reporting/photo moderation, demo trade interactions, local chat/research/favorites/progress, all32 offline routes and protected real routes.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/check-html-preview.mjs`: **3 viewport checks passed**; offline portal navigation makes no private API requests.
- `scripts\pnpm.cmd lint`: passed with zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd build`: passed;32 previews exported,35 HTML files and JavaScript validated.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/check-admin-memberships.mjs`: configured main website admin login/directory passed; no membership decisions changed.

Independent read-only review found hold cancellation, invisible sidebar focus targets and collapsed social-feed state issues. All were fixed with regression coverage. Browser checks also caught and fixed exported gallery asset paths and initial sidebar positioning.

Screenshots: `docs/screenshots/{desktop,ipad,mobile}-v2-trade.png`, `*-v2-dashboard.png`, `*-v2-admin.png` and existing gallery/membership/moderation captures.

## Remaining implementation and launch work

- No live MT5 connection, trade execution, Python bridge exposure, broker credentials or Telegram bot integration. [Future API contract](V2_EA_TELEGRAM_CONTRACT.md).
- No verified indicator/backtest engine or imported market datasets. Research drafts are not validation.
- Support chat, mentorship announcements, social demo likes/comments, favorites and learning progress are local prototypes, not multi-user backend features. Actual Community remains persisted and polls for updates; it is not advertised as WebSocket realtime.
- The separate screen/microphone Live Trade broadcast remains a proposed design, not implemented by this V2 UI upgrade. Streaming provider credentials and the security-reviewed live-room backend are still required.
- Production password-reset mail, domain/HTTPS hosting, persistent hosted video storage/backups and credential rotation remain launch tasks.
- No new paid service was provisioned. No Git branch/commit was possible because the supplied workspace has no Git repository.
