# JustMarkets MT5 server picker

Implemented 1 November 2026. Open http://127.0.0.1:3000/app/settings after signing in.

The read-only broker section now offers a native, keyboard/touch-accessible server selector. It prefills the exact saved server, preserves names missing from the suggestion list, and never guesses a server when the profile has none. JustMarkets accounts automatically receive server suggestions. The Personal details server input also offers those names through a datalist, with manual entry retained for other servers/brokers.

Choosing a different server copies it into the existing profile form. **Save selected server** explicitly submits that form through the established profile API and optimistic version check. Changing broker details retains the existing membership re-review rule. Connecting is blocked while a server change is unsaved. No investor password is included in a profile-save request.

## Source and implementation

- `apps/web/server/broker-servers.js`: bounded, deduplicated JustMarkets-only name validation and four common reference suggestions. The reference corresponds to the broker's published [Live, Live2, Demo and Demo2 WebTerminal routes](https://justmarkets.com/trade/web-terminal); it is not exhaustive or a connection check.
- `apps/web/server/broker-provider.js`: server-side GET to MetaApi's [known MT5 server search](https://metaapi.cloud/docs/provisioning/api/mtServers/getKnownTradingServers/), using the existing secret token and fixed provider origin.
- `apps/web/server/broker-routes.js` and `index.js`: authenticated/rate-limited GET `/api/broker/servers`. Configured provider results are labeled `metaapi`; missing configuration, empty results and provider errors fall back to explicitly labeled `reference` suggestions. The endpoint does not create an account, connect a broker or query the new broker-connection database table.
- `apps/web/templates/broker-connection.html`, `apps/web/server/render.js`, `apps/web/public/broker-connection.js` and `account-settings.css`: native selector, profile suggestions, explicit save action, dirty-state protection and scoped responsive styling. Generated settings HTML and the existing authorized-change preservation overlay were refreshed.
- Tests: `broker-servers.test.ts`, `broker-provider.test.ts`, `broker.test.ts`, `account-settings.spec.ts`.

The completed public homepage, authentication/authorization policies, broker credential handling and disabled trading controls remain unchanged. No database migration or actual provider token change was needed.

## Verification

| Exact command | Result |
| --- | --- |
| `.\scripts\pnpm.cmd build` | Passed: 26 active exports, 53 HTML files validated. |
| `.\scripts\pnpm.cmd lint` | Passed, zero warnings. |
| `.\scripts\pnpm.cmd typecheck` | Passed. |
| `.\scripts\pnpm.cmd test` | 75 passed in 23 files, including homepage preservation. |
| `.\scripts\pnpm.cmd test:integration` | 77 passed in 14 files, disposable local database only. Covers server lookup authentication, configured results, sanitized fallback and rejected mutation. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts` | 12 passed at 1440/834/390: empty-server safety, suggestions, explicit save/re-review, unrelated-broker filtering, credentials and calendar checks. Synthetic fixtures only. |
| `.\scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` | 2 passed: existing desktop/phone signup, login, profile/photo changes, approval and revocation. Disposable local database only. |
| Running website smoke check | Existing owner sign-in succeeded; authenticated server lookup returned 200 and four `reference` suggestions. Temporary check session logged out. |

Integration/auth tests used `DATABASE_URL=postgresql://postgres@127.0.0.1:5547/postgres?schema=public`, `APP_ORIGIN=http://127.0.0.1:3117`, `NODE_ENV=test`, `BROKER_READ_ONLY_ENABLED=false` and empty `METAAPI_TOKEN`. Hosted client data was not used for fixtures. Existing non-blocking Node color and Vite future-loader notices remain.

The local website was refreshed and left running on port 3000. The isolated test app and database were stopped after verification. [Mobile settings capture](screenshots/account-settings/settings-mobile-member.png) uses synthetic account details.

**Remaining setup:** real MetaApi directory retrieval and broker/P/L synchronization are not active or tested against a provider account yet. Follow [READ_ONLY_BROKER_SETUP.md](READ_ONLY_BROKER_SETUP.md). The exact account server must still be confirmed in MT5 or the broker account; suggestions alone cannot identify the member's account or populate P/L results.
