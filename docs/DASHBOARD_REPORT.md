# Member Dashboard

The former Overview at `/app` now displays a Dashboard based on the supplied performance-calendar example. Its navigation entry and offline category label are Dashboard. The existing access policy is unchanged: verified members and administrators can open it; free members keep their Mapping landing page.

Six cards show Win Rate, Weekly P/L, Monthly P/L, Yearly P/L, Average Winning Trade and Average Losing Trade. The calendar has Sunday–Saturday columns, Malaysia-local current month/today highlighting, previous/next controls, a Today button, keyboard-accessible date buttons and a selected-date details panel. Desktop uses six cards in a row; tablet uses three and mobile uses two.

There is **no connected trade-history source** in this phase. Metrics show unavailable values, and every calendar date currently has no recorded trades. The example's prices, P/L totals and win rate were not copied as user data. This is an interactive empty dashboard, not a working performance aggregation service; no journal entry editor, broker import or MT5 connection was added. TradingView remains on Daily Analysis / Mapping, and the old illustrative account figures were removed from the Dashboard.

Community's About this room now contains only the two requested motivational paragraphs plus the existing membership-details link. The sentence about registered readers and verified posters was removed from that description; actual server authorization is unchanged.

## Files and verification

The layout is in `apps/web/pages/member/overview.html`; its calendar logic is `apps/web/public/dashboard.js`, and responsive styles are in `apps/web/public/styles.css`. The route intentionally remains `/app`.

Commands use `scripts\pnpm.cmd` on this Windows workspace:

- `build`: 31 complete offline screens exported; 34 HTML files and server/browser JavaScript validated.
- `lint`, `typecheck`: passed.
- `test`: 30 unit tests passed.
- `test:integration`: 50 passed.
- `exec playwright test tests/e2e/dashboard.spec.ts`: 3 passed across desktop, iPad and mobile, covering metric empty states, calendar navigation, today reset, selection and overflow.

`scripts\pnpm.cmd test:e2e`: **57 passed** across desktop, iPad and mobile (1.2 minutes). Chart and offline-network expectations were updated because TradingView now appears only on Mapping; the admin-notice assertion was scoped to its notice after adding the accessible calendar status panel. A read-only review found no functional defects.

Screenshots: `docs/screenshots/desktop-dashboard.png`, `ipad-dashboard.png`, `mobile-dashboard.png`. All performance values are unavailable rather than synthetic trading results.

No live MT5 trading is enabled.
