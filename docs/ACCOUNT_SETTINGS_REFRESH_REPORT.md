# Account Settings and prepared broker-history integration

Delivered 1 November 2026.

## Result

Client and admin Account Settings now use a restrained, responsive layout with a compact profile-photo area, personal details and sign-in/access information. Telegram Notifications and Device Security panels have been removed. Existing profile saving, photo ownership, login/password-reset routes and membership permissions remain in place. The public homepage is unchanged.

Verified members have a prepared **read-only broker connection** section and P/L Calendar integration. They are currently disabled with a clear service-setup message. No real broker account was created, no MetaApi token was supplied, and the new migration was **not applied to hosted Supabase**. The existing local website was restarted and remains at http://127.0.0.1:3000.

## Files and responsibilities

- `apps/web/templates/account-settings.html`, `profile-card.html`, `broker-connection.html`: shared client/admin profile layout and member-only read-only connection form. Existing data hooks are retained.
- `apps/web/public/account-settings.css`: scoped settings styles and calendar source/status styling, responsive at 1440/834/390, with reduced-motion support. No homepage stylesheet changes.
- `apps/web/public/broker-connection.js`: availability gating, consent, show/hide investor password, credential clearing, connect/sync/disconnect and conflict/error feedback. No password storage.
- `apps/web/templates/performance-calendar.html`, `apps/web/public/dashboard.js`: real-source snapshot rendering, account-currency totals, MYT dates, explicit last sync/stale/unavailable states and selected-date details.
- `apps/web/server/broker-provider.js`: bounded native-fetch MetaApi adapter, fixed provider origins, server-only token, transaction key and no order/trade methods. Requires matching identity plus explicit investor mode and trading disabled before retrieving history.
- `apps/web/server/broker-routes.js`: authenticated, principal-owned connection/calendar/sync endpoints, same-origin mutations, membership checks, strict input, rate limiting, optimistic versioning, operation leases and audit events. Disabled mode avoids querying the uninstalled broker table.
- `apps/web/server/broker-performance.js`: decimal aggregation, trade-deal filtering, pagination-result normalization/deduplication and complete-position statistics. No invented prices or results.
- `prisma/schema.prisma`, `prisma/migrations/202611010001_read_only_broker/migration.sql`: one own-account connection and bounded snapshot, uniqueness/state constraints, RLS and access restrictions. No investor-password/token columns.
- `apps/web/server/render.js`, `index.js`, `scripts/export-preview.mjs`: existing routes/assets and offline export integration. Generated settings/calendar HTML was refreshed.
- `.env.example`, `README.md`, `docs/READ_ONLY_BROKER_SETUP.md`: disabled-by-default configuration and owner activation instructions. Actual deployment secrets were not changed.
- Broker unit/integration tests, `tests/e2e/account-settings.spec.ts`, `playwright.settings.config.ts`: provider safety, financial calculations, ownership/revocation, credentials and responsive UI coverage.
- `docs/ACCOUNT_SETTINGS_REFRESH_BASELINE.json`: explicit eight-entry settings/calendar/schema/server overlay for the existing preservation test. The historical baseline was retained; other captured bytes, including protected homepage visuals, still match. Git metadata/tools were unavailable, so verification uses SHA-256 comparisons rather than a claimed Git diff.

## Verification

Commands were run from the repository root using `scripts/pnpm.cmd`. The executable prefix is shown exactly for reproducibility.

| Command | Outcome |
| --- | --- |
| `.\scripts\pnpm.cmd db:generate` | Passed; Prisma client regenerated. |
| `.\scripts\pnpm.cmd db:migrate` with disposable localhost PostgreSQL on port 5547 | Passed; new migration applied locally only. |
| `.\scripts\pnpm.cmd build` | Passed; 26 active HTML exports and 53 HTML files validated, with JS/scene build checks. |
| `.\scripts\pnpm.cmd lint` | Passed; zero warnings. |
| `.\scripts\pnpm.cmd typecheck` | Passed for web and tests. |
| `.\scripts\pnpm.cmd test` | 73 passed in 22 files. Includes public-homepage preservation checks. |
| `.\scripts\pnpm.cmd test:integration` | 76 passed in 14 files, using disposable local database and synthetic provider responses. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts` | 9 passed: 1440 desktop, 834 tablet, 390 mobile, disabled service, show/hide/credential clearing, snapshot/day detail and month navigation. Synthetic UI data only. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.clean.config.ts` | 6 passed: existing shell/navigation, touch controls, menus, keyboard, dialogs, contrast and reduced motion. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` with local test environment | 2 passed: real signup/login, profile/photo save, approval, launch gating, revocation and logout on desktop/phone. Disposable accounts only. |
| Local running-site smoke check | Homepage 200, existing admin login 200, admin settings 200, removed panels absent and authenticated broker endpoint reports setup pending. The temporary check session was logged out. |

Tests use the isolated `DATABASE_URL=postgresql://postgres@127.0.0.1:5547/postgres?schema=public`, `APP_ORIGIN=http://127.0.0.1:3117`, `NODE_ENV=test`, `BROKER_READ_ONLY_ENABLED=false` and an empty `METAAPI_TOKEN`. Set these only for the test shell; never run destructive integration/browser fixtures against hosted data. Provider-adapter tests replace fetch with synthetic responses.

Non-blocking existing tooling notices: Vite's future native-config loader warning and Node's `NO_COLOR`/`FORCE_COLOR` warning. No failed checks remain.

Visual captures, with synthetic member/admin information:

- [Desktop client](screenshots/account-settings/settings-desktop-member.png)
- [Tablet client](screenshots/account-settings/settings-tablet-member.png)
- [Mobile client](screenshots/account-settings/settings-mobile-member.png)
- [Desktop admin](screenshots/account-settings/settings-desktop-admin.png)

## Activation and remaining limits

Follow [READ_ONLY_BROKER_SETUP.md](READ_ONLY_BROKER_SETUP.md) to create MetaApi, configure server secrets, migrate the hosted database, restart and validate an investor-password demo account. MetaApi/broker connectivity and real statements remain untested because no provider account exists yet.

This version refreshes history manually. Background scheduling, live streaming, automatic provider cleanup on membership revocation, scheduled snapshot retention and reconciliation of uncertain remote creation are not implemented. History is capped at 10,000 deals and roughly one year; broker retention may reduce availability. Position statistics deliberately exclude incomplete histories and netting reversals. Provider usage and cleanup must be managed by the owner.

Tools remain Coming soon. No real MT5 order management, EA pairing or trading authority was added. Admin access does not grant control of member broker positions.
