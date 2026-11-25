> Historical alternative: the owner subsequently selected the [Windows PC connector](PC_READ_ONLY_CONNECTOR.md). The importer is preserved internally; it is no longer the current Settings/Calendar UI.

# Manual MT5 statement imports

Current owner-selected method, 1 November 2026. This replaces the MetaApi/password form in client Settings. No investor password or MetaApi subscription is required. Imported statements are user-supplied records, **not broker-verified results or live telemetry**.

## Use it

1. Save your correct broker, MT5 account number and server in Settings. Keep the existing verified IB + qualifying deposit membership approval; changing account details still requires re-review.
2. On MT5 desktop, open Toolbox → History. Select the period, then Report → HTML. Use the original **English History statement containing its Deals table**, with the account number and currency. Summary-only visual reports, Strategy Tester backtests, PDF, XML and Excel files are not supported by this importer. [Broker export instructions](https://help.oanda.com/eu/en/faqs/mt5-user-guide-eu.htm).
3. Open [P/L Calendar](http://127.0.0.1:3000/app/calendar#statement-import), choose the HTML file and its **broker server UTC offset**. The offset applies to the whole file. Confirm it with your broker; do not assume it is Malaysia time. For historical broker clock changes, export separate periods and select the correct offset for each.
4. Select **Preview statement**, check the account suffix, currency, date range and execution counts, then **Confirm import**. Cancel leaves the database unchanged.
5. Import newer reports whenever you want to update the calendar. Previously imported executions are skipped. Overlapping reports with conflicting amounts/timestamps are rejected instead of silently overwriting results. Results are converted to MYT.

Limits: 2 MB HTML files, 15,000 table rows per file and 10,000 unique trading executions per account calendar. UTF-8 and UTF-16 exports are supported. Broker report layouts vary: unsupported or incomplete layouts produce an error without saving data. Validation so far uses synthetic classic MT5 fixtures; a real owner-exported report has not yet been supplied for acceptance testing.

Daily/weekly/monthly/yearly P/L is profit + commission + swap + fee from buy/sell execution rows. Cash deposits/withdrawals and unallocated balance adjustments are excluded. Closed-position win rate and average win/loss remain unavailable unless complete position identifiers and entry/exit history are present. Standard reports often omit those identifiers; the app does not invent the statistics. This is a trading cash-flow calendar, not a floating-equity or accounting statement.

## Implementation and security

- `statement-parser.js`: parse5 reads HTML as inert data, with bounded rows, strict English numeric/date fields, account/currency checks, duplicate detection and explicit timezone conversion. Uploaded scripts, images and links are never executed or rendered.
- `statement-routes.js`: authenticated, verified-member-only endpoints `/api/statements/preview`, `/api/statements/import`, `/api/statements/calendar`. Mutations require same-origin requests and strict input. Preview confirmations expire after ten minutes and bind the owner, file hash, offset and stored version. Commit rechecks account/membership inside the database transaction, saves history and audit together, and rejects stale writes.
- `StatementHistory` and migration `202611010002_statement_import`: one private account-scoped history per user, FK cascade, unique owner, JSON array/currency constraints, RLS and revoked direct client database access. Raw HTML and passwords are not stored. Admin role never selects another user's history or grants broker trading power.
- `statement-import.js`, `statement-import.html`, `statement-settings.html`, `dashboard.js`: preview/confirm/cancel flow, manual source labels, meaningful empty/error states and retained JustMarkets suggestions in profile fields. Credentials are no longer collected in the client flow. Optional legacy MetaApi code remains inactive.
- `auth-clean.css`: scoped removal of sidebar branch pseudo-elements on sign-in, signup and password-reset pages. Public homepage styling remains unchanged.
- `render.js`, `index.js`, export script and generated HTML wire these features into the existing app. Historical preservation baselines were retained; the explicit overlay now allows the requested auth-shell styling and settings/calendar changes. Authentication backend source is unchanged.

## Verification

| Command/check | Outcome |
| --- | --- |
| `.\scripts\pnpm.cmd db:generate` | Passed. |
| `.\scripts\pnpm.cmd db:migrate` against disposable localhost PostgreSQL | Passed. |
| Configured Supabase migration | Verified TLS schema backup saved privately in `.tools/pre-statement-schema.sql`; additive migrations applied successfully. Existing client records were not edited. |
| `.\scripts\pnpm.cmd build` | Passed: 26 active exports, 55 HTML files and JavaScript checks. |
| `.\scripts\pnpm.cmd lint` | Passed, zero warnings. |
| `.\scripts\pnpm.cmd typecheck` | Passed. |
| `.\scripts\pnpm.cmd test` | 78 passed in 24 files. Includes parser financial/date validation, duplicate/conflict handling and homepage preservation. |
| `.\scripts\pnpm.cmd test:integration` | 80 passed in 15 files. Own-account isolation, membership/origin checks, signed preview binding, altered/stale files, duplicate imports and profile/revocation handling. Local fixtures only. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts` | 9 passed at 1440/834/390: manual Settings, UTF-16 upload, preview/cancel/confirm, calendar refresh, removed auth sidebar lines and password show/hide. Synthetic statements only. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` | 2 passed: desktop/phone real signup/login, profile/photo saving, approval/revocation and logout against a disposable local database. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.clean.config.ts` | 6 passed: existing shell, touch, keyboard, dialogs, contrast/reduced-motion checks. |
| Running-site smoke | Homepage 200; sign-in/signup 200 with scoped sidebar CSS; authenticated statement calendar endpoint 200 and Settings contains manual-import instructions without investor-password input. Temporary check session logged out. |

Test database: `postgresql://postgres@127.0.0.1:5547/postgres?schema=public`, test origin `http://127.0.0.1:3117`, `NODE_ENV=test`. Hosted customer data was not used as test fixtures. MetaApi remained disabled. Non-blocking existing tooling notices about Vite future config loading and Node color environment flags remain.

The local website is left running at http://127.0.0.1:3000. [Mobile calendar capture](screenshots/account-settings/settings-mobile-statement.png) uses synthetic uploaded data. No live MT5 trading, automatic sync, manual history deletion/reset UI or position reconstruction from incomplete reports was added. Wrong-account/conflicting history requires correction before import rather than overwriting the existing calendar. Preview confirmations are process-local and must be repeated after a server restart.
