# Edit and run the plain web app

The application now uses **HTML, CSS and JavaScript**. Next.js, React, JSX and Tailwind have been removed at the user's request. It still implements Phase 1 only; MT5 trading is disabled.

## Files to edit

| File or folder | Purpose |
| --- | --- |
| `apps/web/pages/index.html` | Landing page content |
| `apps/web/pages/member/overview.html` | Member dashboard |
| `apps/web/pages/member/mt5.html` | Disconnected MT5 screen |
| `apps/web/pages/auth/` | Login, signup and password reset forms |
| `apps/web/pages/admin/` | Admin screens, including membership review |
| `apps/web/templates/layout.html` | Shared full HTML document and layout |
| `apps/web/templates/*-navigation.html` | Shared navigation |
| `apps/web/public/styles.css` | Plain CSS, responsive layouts and theme colors |
| `apps/web/public/app.js` | Browser JavaScript: menus, forms, filters and logout |
| `apps/web/server/index.js` | Native Node.js HTTP server and protected routing |
| `apps/web/server/auth-routes.js` | JavaScript authentication handlers |

Every page file is now a complete HTML document that can be opened directly in a browser. Start with `apps/web/pages/index.html` and use **Explore all categories** to browse all 30 screens. Offline menus, FAQ and signal filters work; authentication is disabled in the preview and no account is signed in.

Edit the content between the PAGE CONTENT START/END comments. The server extracts that content and supplies its own authenticated layout; it never trusts a preview profile. Refresh after editing HTML/CSS. After changing the shared shell/navigation, `pnpm preview:export` refreshes the standalone documents while preserving their editable contents. This export reads no database, environment file or credentials. `pnpm build` also refreshes the previews and validates HTML/JS.

`pnpm dev` restarts the backend when imported JavaScript files change. No frontend compilation or bundling is necessary. TypeScript remains a development checker and test/config language, not the application language.

`apps/web/pages/index.html` is the local real-app entry: it opens the running HTTP website for signup/login and client/admin testing. `demo-preview.html` is the offline UI demo only. A stopped server produces a retry/start panel in index instead of an automatic demo redirect. The actual server still returns 404 for source/template file URLs; private routes always require sessions. See [entry behavior](REAL_INDEX_ENTRY.md).

## Open the website

Open **http://127.0.0.1:3000**. Use this exact host; APP_ORIGIN protections reject a different origin such as localhost.

For hands-on account testing on Windows, double-click `START_YENGFX_TEST.cmd` in the repository root and keep its window open. It runs the existing development command with the bundled Node/pnpm and does not change credentials or permissions. If every local page shows connection refused, the web server is stopped; start this launcher before reopening index or the admin URL.

With the existing hosted Supabase configuration, run only `scripts\pnpm.cmd dev`; no local database process is required. The local-database instructions below are alternatives for isolated development/tests. Never point destructive test suites at hosted customer data.

The current workspace has portable Node 24.22.0 and pnpm 10.28.2 in ignored `.tools/`. From PowerShell, use `scripts\pnpm.cmd` instead of `pnpm` if Node/pnpm are not installed globally. No PowerShell policy change is required.

In two terminals at the repository root:

```powershell
# Terminal 1: existing local development database
scripts\pnpm.cmd db:local
```

```powershell
# Terminal 2: plain JavaScript web app
scripts\pnpm.cmd dev
```

If those services are already running, just open the URL. Stop an existing app server before starting another on the same port. `scripts\pnpm.cmd start` runs production mode; `dev` enables the explicitly configured development reset outbox.

## Demo accounts

- Member: `member@yengfx.test`
- Admin: `admin@yengfx.test`

Their generated local-only passwords are in the ignored root `.env`, under DEMO_MEMBER_PASSWORD and DEMO_ADMIN_PASSWORD. Open that file in the editor; do not share or commit it. You can also register a new member at `/auth/register`. Registration cannot create admins.

Free members land on Membership. Full member access requires manual admin approval for JUSTMARKET IB `jai4w0w6` and a qualifying deposit of at least USD 100. Request at `/app/membership`; review at `/admin/members`. The configured local admin username is `YENGFX`; its supplied password is stored only in ignored configuration and as a database hash. See [IB_MEMBERSHIP_REPORT.md](IB_MEMBERSHIP_REPORT.md). Telegram login is not configured.

## Fresh setup with PostgreSQL

Install Node LTS 22.12+ and pnpm 10.28.2. For the normal PostgreSQL setup, install Docker Desktop:

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
```

Set distinct local passphrases (12+ characters) in the two DEMO_*_PASSWORD variables, then `pnpm db:seed` and `pnpm dev`. Seed is idempotent: it does not overwrite existing passwords or roles, and refuses production mode. To change an existing password, use reset rather than editing seed variables.

The example DATABASE_URL targets Docker PostgreSQL on 127.0.0.1:5432. Compose uses a local placeholder password and binds the database only to loopback. Update DATABASE_URL if you override POSTGRES_PASSWORD. Real PostgreSQL/Docker verification remains outstanding because Docker is unavailable here.

## Local database fallback

This workspace currently runs local PGlite, a PostgreSQL-compatible development fallback on 127.0.0.1:5433 with persistence in ignored `.local-postgres/`. It is not a production database. For a fresh fallback setup, set this URL in `.env`, run `pnpm db:local` in another terminal, then generate/migrate/seed:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres?schema=public&connection_limit=1&statement_cache_size=0&pgbouncer=true
APP_ORIGIN=http://127.0.0.1:3000
```

Those settings avoid prepared-statement collisions in the local multiplexer. Run one app server at a time during verification; if switching between servers exhausts fallback handlers, restart the local database and app. Re-run security suites against real PostgreSQL before deployment.

## Password reset delivery

Set DEV_EMAIL_OUTBOX=true locally and use `pnpm dev`. For an existing account, forgot-password writes a reset message to ignored `apps/web/.local-mail/*.json`. Open the latest matching file in your editor. Never publish that directory or share its links. Files are outside publicly served assets; on Windows their protection depends on your account ACLs.

Links expire after 30 minutes and can be used once. Reset revokes all sessions and other unused reset tokens. The browser response never exposes the token and gives the same message for unknown emails. For production delivery, configure private `RESEND_API_KEY` and `RESET_EMAIL_FROM` with a verified sender and an HTTPS `APP_ORIGIN`. The development outbox is always disabled in production. Without a configured provider, production returns 503. Delivery runs after the generic response through a bounded, best-effort in-process queue. Jobs can be lost on restart and have no automatic retry; a durable worker remains a launch hardening task.

To test without touching Supabase or sending real email, run `node scripts/with-local-database.mjs delivery-server` on port 3002, then `node scripts/with-local-database.mjs delivery` in another terminal. Both use the isolated local database and explicitly disable the external provider.

## Checks

Use a dedicated local demo/test database. Integration/browser tests create and delete their own test users and clear test rate-limit budgets; never target production.

```powershell
pnpm build          # Validates HTML/JS; no frontend bundle is generated
pnpm lint
pnpm typecheck      # Checks JavaScript as well as test tooling
pnpm test
pnpm test:integration   # Requires app and database running
pnpm exec playwright install chromium
pnpm test:e2e          # Requires seeded demo accounts
```

Screenshots: `docs/screenshots/`. Browser HTML report/traces are ignored and can contain test session/reset artifacts; do not publish them. Stop servers before regenerating Prisma after schema changes on Windows, since its query-engine DLL can be locked while loaded.

## Security and deferred functionality

Database-backed sessions, scrypt passwords, hashed random tokens, server role guards, same-origin mutation checks, bounded request bodies, rate limits and audit events are preserved. Video uploads stream to private disk with a 500 MiB limit; metadata uses smaller JSON bounds. Production cookies are Secure/HttpOnly/SameSite=Lax with the __Host- prefix. Browser scripts are local files; CSP disallows inline scripts and styles. Dynamic profile text and attributes are escaped. Public assets use an explicit whitelist; lesson videos require authenticated, entitled requests.

Before deployment, configure and verify real email delivery, HTTPS/trusted ingress and resource limits, database backups/retention and monitoring, and verify real PostgreSQL and native devices/Safari. C++ is not required to run this browser app; no unused native component or trading bridge was added.

Manual Mapping/Signals publishing and private video Educations are implemented; see [manual publishing](MANUAL_CONTENT_REPORT.md) and [video lessons](VIDEO_EDUCATIONS_REPORT.md). Back up `.private-videos/` alongside the database. Journal persistence, academy progress, payments, notifications, Telegram, device pairing, telemetry, command execution and verified backtests remain deferred. No live trading is enabled. The original Next.js source is backed up locally in ignored `.tools/next-backup/`; it is not part of the running app.

