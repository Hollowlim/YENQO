# YENGFX HUB — Codex Developer Starter Pack

**Free Trading Tools V1:** signed-in members can use XAUUSD P/L, Risk & Lot Size and Risk/Reward calculators at `/app/mt5`. No broker or paid API is required. MetaApi is disabled in the current local configuration; its earlier integration is preserved. The MT5 snapshot tab remains disconnected pending secure per-member pairing. See [delivery, screenshots and validation](docs/FREE_TRADING_TOOLS_REPORT.md) and [bridge review](docs/TRADING_TOOLS_BRIDGE_REVIEW.md).

**Approved V7 public homepage:** [implementation, screenshots and verification](docs/HOMEPAGE_V7_REPORT.md). Edit `apps/web/templates/homepage-v7.html`, `homepage-v7-layout.html`, and `apps/web/public/homepage-v7.css` / `.js`. The Client/Admin UI and Beta 1 access rules remain unchanged. No site publication is included.

**Current Beta 1 launch scope:** [active modules, deferred routes, preview sources and verified checks](docs/BETA_1_LAUNCH_SCOPE.md). Market Analysis / Mapping, Signals and in-app Community are deferred, including their HTTP APIs. No Telegram community button is included. Free members land on Membership; private education still requires admin-approved IB + qualifying USD 100 verification. Tools now includes free calculators; broker execution remains unavailable.

**Premium V2:** [delivery report, test commands and limitations](docs/PREMIUM_V2_REPORT.md). Open http://127.0.0.1:3000 for real login or `apps/web/pages/index.html` for offline previews. MT5 trading remains disabled.

**Website account audit:** [tested user/admin flows, fixes and remaining launch work](docs/WEBSITE_AUDIT_2026-10-23.md).

**Clean Premium Client/Admin refresh:** [private layout, retained integrations, homepage comparison and verification](docs/CLEAN_PREMIUM_PORTAL_REPORT.md). Edit `apps/web/templates/portal-layout.html`, `portal-member-overview.html`, `portal-admin-overview.html`, the `portal-*-navigation.html` files and `apps/web/public/portal-clean.css`. Public homepage and authentication templates retain their existing styles.

**YENGHUB — The Edge Is Earned:** [homepage WebGL implementation, verification and fallback behavior](docs/YENGHUB_WEBGL_REPORT.md). Run `scripts\pnpm.cmd build` to regenerate the local scene bundle and previews.

Figma source of truth: https://www.figma.com/design/iJ3pndGzZkvJc2rlUcTyy5

Phase 1 now uses **plain HTML, CSS and JavaScript**, as requested. Next.js and React have been removed. The public page uses [homepage-v7.html](apps/web/templates/homepage-v7.html) and its separate public-only layout/styles. Earlier `launch-home.html` and `product-home.html` variants are retained. Current private overviews use `launch-member-overview.html` and `launch-admin-overview.html`. Run `scripts\pnpm.cmd build` to regenerate both entry previews. See [local setup](docs/LOCAL_DEVELOPMENT.md). No live MT5 trading is enabled.

Signup asks for display name, email and password. Members supply broker/MT5 details later in Account Settings or Membership; administrators review them in the member directory. See the historical [Supabase setup report](docs/SUPABASE_CLIENT_DATABASE.md); this launch-scope update tested only an isolated local database.

**Real account testing:** open `apps/web/pages/index.html` in Chrome or Edge. It opens the running website at http://127.0.0.1:3000/ for real signup, login and client/admin access. Start `scripts\pnpm.cmd dev` if needed; a stopped server produces a retry panel rather than a demo redirect. **Offline design preview only:** open `demo-preview.html`; its catalog contains 26 active route screens and its auth forms are disabled. See [the entry-point guide](docs/REAL_INDEX_ENTRY.md).

Manual Mapping/Signals publishing and in-app Community implementations are preserved but unavailable over HTTP in this launch. Their older reports describe the deferred implementation rather than current availability.

Administrators can upload and publish private MP4 lessons through **Educations CMS** at `/admin/content`. Verified IB + USD 100 members watch at `/app/academy`. See [video lesson usage, storage and verification](docs/VIDEO_EDUCATIONS_REPORT.md).

The member `/app` overview focuses on education and account access. The **P/L Calendar** is a separate category at `/app/calendar`. Members connect their own MT5 investor account through MetaApi for read-only P/L snapshots. The private provider token is configured and its server-directory lookup is validated; a genuine demo broker test remains pending. Refresh uses **Sync history**. See [MetaApi setup and validation](docs/READ_ONLY_BROKER_SETUP.md). PC connector/manual importer implementations remain preserved alternatives; the PC worker and endpoints are disabled.

## Goal
Build a **production-oriented responsive full-stack web app** for YENGFX: community, educational XAUUSD signals, market mapping, academy, membership, journal, Strategy Lab/backtests, and **individual members' own MT5 EA management**. Use black/obsidian/gold premium design. The current Figma is an editable visual specification, NOT proof of implemented interactions.

## Start here (Windows / VS Code / Codex)
1. Create a fresh repository `yengfx-hub`. Copy this pack into its root.
2. Install a supported LTS Node.js, pnpm, Git, Docker Desktop, and VS Code. Check `node -v`, `pnpm -v`, `docker --version`.
3. Open the repository in VS Code. Start Codex at the project root.
4. Paste the prompt in `prompts/01-foundation.txt`. Ask Codex to inspect the repository first and create only the first phase.
5. After Codex implements phase 1, run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; ask Codex to fix failures.
6. Follow phases 02–06 sequentially, reviewing each phase before proceeding.
7. Never paste your real Telegram bot token, trading account password, admin credentials, or live device secret into Codex chat or commits. Use local `.env` and secret management.

## Modules

The following lists retain the broader product roadmap. Market Mapping, Signals and in-app Community are deferred for the current launch; Telegram promotion is handled separately. Consult [Beta 1 scope](docs/BETA_1_LAUNCH_SCOPE.md) for actual availability.
- Public: Home, Sign up / Login, About, FAQ, educational preview
- Member: Overview, Signals, Signal detail, Daily Mapping, Academy, Journal, Membership, Notifications, Settings
- Trading: EA device pairing, MT5 Overview/Positions, trade command confirmation/receipt, status history
- Research: Strategy Lab, non-repainting indicator specification, backtest configurations/results and methodology
- Admin: overview, signal CMS, mapping CMS, content CMS, member/entitlement administration, command audit
- Responsive: PC 1440, tablet 768–1024, phone 390 (adapt beyond those widths)

## Non-negotiables
- Initially **DEMO / READ-ONLY** trading UI. Never pretend mock MT5 data is live.
- Each member can view/control ONLY their own linked account. Admin is not automatically a trader for client accounts.
- Web UI never directly invokes a local `127.0.0.1:8080` bridge on another user's machine.
- MT5 terminal/EA runs on a customer's Windows PC or VPS and **initiates outbound TLS connections** to YENGFX backend.
- Telegram and Web share one backend, one member identity mapping and per-device command queue.
- Only after audited simulation and demo-account tests may real trade execution be explicitly enabled.
- Never market signal or backtest returns as guaranteed; before paid signals/automation, seek Malaysia regulatory review.

## Recommended stack
- Current implementation: plain HTML/CSS/browser JavaScript and a native Node.js JavaScript HTTP server; this replaces the original Next.js recommendation at the user's request.
- PostgreSQL + Prisma (or Drizzle); session-capable auth (Auth.js or equivalent)
- Zod server-side validation; per-user and per-device authorization on ALL endpoints
- TanStack Query for client fetching; lightweight chart library for display
- Vitest / Playwright; Docker Compose for local PostgreSQL
- Separate Python or MQL5 bridge agent for MT5 connectivity; do not put a broker secret in the browser
- Queue initially PostgreSQL-backed with leases/TTL/idempotency; introduce Redis only when needed

## Repository structure target
```
apps/web/pages/           # Editable HTML screen templates
apps/web/public/          # Plain CSS and browser JavaScript
apps/web/templates/       # Shared HTML shell and navigation
apps/web/server/          # JavaScript HTTP server and auth handlers
services/ea-gateway/      # Future device command API (not enabled in Phase 1)
services/telegram/        # Optional bot adapter, later
packages/shared/          # Typed schemas and validation
prisma/                   # Schema and migrations
docs/                     # Architecture, threat model, test matrix
tests/                    # Integration / e2e
```

## Delivery rule
**Current P/L method: MetaApi investor-access history snapshots.** [Setup, privacy, costs, limits and verification](docs/READ_ONLY_BROKER_SETUP.md). The private provider token is configured; a genuine demo broker test remains pending and real-account history acceptance is disabled.

Preserved alternative: [Windows PC connector guide](docs/PC_READ_ONLY_CONNECTOR.md). The PC worker is stopped. MetaApi reports setup pending until the server token is supplied. Tools execution remains disabled.

Password resets and optional IB membership approval/rejection/revocation notices use server-side Resend. Sending requires a verified domain and private API key; membership email is opt-in. See [Resend setup and delivery limitations](docs/RESEND_SETUP.md). Membership review remains manual and email acceptance does not prove inbox delivery.

Admin approval and MC / changed-IB revocation: [workflow and verification report](docs/ADMIN_DIRECT_MEMBERSHIP_REPORT.md).

Each Codex phase must give a concise file-change summary, commands run, tests passed/failed, remaining risks, and a screenshot or URL for visual review. Do not move to live trading without explicit approval.
