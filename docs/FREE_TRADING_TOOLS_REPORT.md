# Free Trading Tools V1

Open **http://127.0.0.1:3000/app/mt5**, sign in and choose Trading Tools. This is the existing authenticated Tools route, available to registered free and verified members. Other membership rules and login destinations are unchanged.

## Delivered

- **XAUUSD P/L:** BUY/SELL, effective entry/exit, volume, non-negative extra costs, quote/account currency and manual conversion.
- **Risk & Lot Size:** balance, risk percentage, directional SL/TP, round-trip account-currency costs per lot, broker minimum/maximum/step and volume rounded down. A budget below minimum displays “No valid position.” Final estimated loss is checked against the budget, including floating-point boundaries and 8-decimal steps.
- **Risk/Reward:** cost-adjusted stop loss and target P/L, net reward/risk, distances and a theoretical break-even percentage. This is arithmetic, not a claimed signal win rate. Non-positive target outcomes are flagged.
- **Configurable broker specification:** contract units per lot, volume limits/step, quote currency, account currency and manual conversion. The 100 oz XAUUSD defaults and 4000-price examples are explicitly illustrative, not detected broker specs or market prices. Same-currency conversion must be 1. Results are estimates and do not cover non-linear broker calculation modes.
- **Read-only MT5 tab:** disconnected, no fabricated balances/positions, no password input and no trade command. The same-origin status endpoint uses the existing database-backed session; it rejects selectors and mutations, rate limits by principal and returns no-store responses. No bridge data is accepted before secure pairing exists.

MetaApi is **disabled** in the local `.env`; its token, prior source and customer data are preserved. No paid API call, cloud-account creation/deployment/removal or real broker operation was performed for this release. The previous PC worker remains disabled. [Bridge review and next-phase gates](TRADING_TOOLS_BRIDGE_REVIEW.md).

## Implementation

| Files | Purpose |
| --- | --- |
| `packages/shared/trading-math.js` | Framework-independent port of the kit's functions, with additional runtime and numeric-boundary validation and a separate risk/reward function |
| `apps/web/templates/trading-tools.html` | Scoped calculator and disconnected account UI |
| `apps/web/components/trading-tools.js`, `apps/web/public/trading-tools.css` | Input validation, accessible tabs, estimates and responsive styles |
| `scripts/build-trading-tools.mjs`, `apps/web/public/trading-tools.js` | Small local browser bundle; also works in the generated offline preview without a module fetch |
| `apps/web/server/tools-snapshot-routes.js` | Real-session, fail-closed disconnected status endpoint; no bridge proxy or auth stub |
| `render.js`, `index.js`, `membership-policy.js`, member navigation | Existing route asset/template loading, API dispatch and free access for the exact calculator route only |
| `scripts/export-preview.mjs`, package build scripts, typecheck configuration | Existing framework/build integration; no Next.js/React installation |
| `tests/unit/trading-*.test.ts`, `tools-snapshot.test.ts`, integration/e2e Tools tests | Math, preservation, authorization, no-provider and responsive checks |

`preview/index.html` was a visual reference only. Its fake navigation, example account data and Next.js scaffold did not replace the application. No database schema or migration was added.

## Preservation

`TRADING_TOOLS_BASELINE.json` records 132 pre-change source/asset/export hashes and eight public/Admin route renders. All protected bytes remain identical except the four reviewed shared files needed for Tools (`render.js`, `index.js`, `membership-policy.js`, member navigation). The public homepage, all existing public assets, Admin templates/pages, authentication/session handlers, membership-review handlers and Prisma schema remain unchanged. All eight public/Admin render hashes match.

The separate `TRADING_TOOLS_APPROVED_CHANGES.json` overlay records member-only exports/navigation and the two changed existing authorization/dispatch sources for older preservation checks. It cannot approve Admin or homepage changes. New calculator CSS/JS load only on `/app/mt5`. Public homepage copy and visuals were deliberately left as approved, including earlier availability wording.

There was no pre-edit screenshot capture for a pixel comparison. Exact source/render hashes verify preservation; the new Tools screenshots provide visual review:

- [1440 desktop](screenshots/trading-tools/tools-desktop.png)
- [834 tablet](screenshots/trading-tools/tools-tablet.png)
- [390 phone](screenshots/trading-tools/tools-mobile.png)

## Verification

All customer-facing tests ran against an isolated **loopback PostgreSQL database on 5547** and test app on 3117, not hosted Supabase. Local email delivery used a separate 3118 app/outbox. Provider calls in existing integration tests were mocked. Browser accounts and results are synthetic fixtures, not customer trading data.

| Command | Result |
| --- | --- |
| `scripts\pnpm.cmd lint` | Passed |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd test` | 103 tests passed, 28 files; includes 1,600 rounding/budget cases |
| `scripts\pnpm.cmd test:integration` | 98 tests passed, 19 files |
| `scripts\pnpm.cmd test:reset` | One-use local password-reset delivery passed |
| `scripts\pnpm.cmd exec playwright test --config playwright.tools.config.ts` | 3 passed: 1440/834/390; real sign-in as free member, calculator tabs/validation/FX/costs, keyboard/touch, no overflow, no provider requests |
| `scripts\pnpm.cmd exec playwright test --config playwright.session.config.ts` | 3 passed: free/verified/Admin sessions persist across homepage/logo navigation until sign out |
| `scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts` | 27 passed: profile pictures, membership, auth UI, preserved historical broker UI and calendar states; API responses mocked |
| `scripts\pnpm.cmd build` | Passed; 59 HTML files checked, 26 active exports |

The kit's unchanged `tests/test_math.cjs` passed all eight supplied checks against both its original compiled TypeScript and the adapted application module bundled as CommonJS. The kit's five Python bridge tests passed with mocked MT5 in an isolated test-only environment; no terminal or bridge service ran. Exact commands and scope are in the kit README and [review](TRADING_TOOLS_BRIDGE_REVIEW.md).

Bundled checks were run with the following commands after extracting the supplied archive into the ignored review directory (the temporary `tests/dist/package.json` specifies CommonJS):

```powershell
scripts\pnpm.cmd exec tsc .tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/web/lib/trading-math.ts --target es2022 --module commonjs --strict --skipLibCheck --outDir .tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/tests/dist
& .tools/node-v24.22.0-win-x64/node.exe .tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/tests/test_math.cjs
scripts\pnpm.cmd exec esbuild packages/shared/trading-math.js --platform=node --format=cjs --outfile=.tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/tests/dist/trading-math.js
& .tools/node-v24.22.0-win-x64/node.exe .tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/tests/test_math.cjs
& .tools/readonly-bridge-tests/Scripts/python.exe -m unittest discover -s .tools/trading-tools-kit/YENGHUB_Trading_Tools_Starter/tests -p test_bridge.py -v
```

The generated application offline preview was also opened directly in Chromium: the P/L example calculated correctly, the MT5 tab remained disconnected with an offline label, and no page JavaScript errors occurred.

Initial test failures were outdated “Tools coming soon/free blocked” expectations, synthetic test selectors matching hidden duplicates, and the password-reset harness not running its expected local outbox service. Those were corrected without changing auth/Admin behavior. Vite emitted its existing extensionless-config-import warning and the Python test library emitted a deprecation notice; these did not affect final results.

## Real, simulated and unavailable

**Real:** local arithmetic, validation, responsive UI, existing signup/login/session enforcement, free Tools access and authenticated disconnected-status response.

**Illustrative:** starting prices, default XAUUSD specification, entered conversion rates and browser test fixtures. No live quote/FX feed or broker result is implied.

**Unavailable:** paired-device MT5 snapshots, automatic P/L syncing through this free bridge, private TLS deployment, investor/demo broker acceptance, real positions, order execution and production bridge readiness. These require the next owner-pairing phase and a separately verified isolated MT5 demo terminal. The application was not published or deployed by this change.
