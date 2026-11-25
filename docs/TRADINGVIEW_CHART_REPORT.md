# TradingView market chart

Readability correction: the chart and iframe now explicitly override widget sizing at 560px desktop/tablet and 440px mobile. A browser regression creates a simulated 150px iframe and verifies its effective height at all three viewport sizes. Volume is hidden to leave more room for price candles.

Signals now shows Scalping and Interday categories with only ENTRY PRICE, SL, TP1, TP2 and TP3. Unpublished levels remain blank with an explicit unpublished state. Detail previews use the same fields; no market levels or outcomes were invented.

Overview and Daily Mapping now embed TradingView's official Advanced Chart widget configured for `OANDA:XAUUSD`, dark theme, one-hour initial candles and Kuala Lumpur timezone. The symbol is fixed; chart toolbar controls remain available. Attribution and a direct TradingView link are retained.

Connected pages and direct-file HTML previews load the widget automatically. There is no initial Load TradingView button. Direct-file chart pages now request TradingView over the internet; other preview navigation and authentication behavior remain unchanged. Script loading errors show a retry action and external chart link. No chart data is fabricated or copied into account balances. Market availability and delays belong to TradingView; the application does not assert that the feed is live. MT5 remains disconnected and trading disabled.

Only `/app` and `/app/mapping` receive CSP permission for the official TradingView loader and widget frames. Authentication and other pages keep self-only scripts. No API keys, broker passwords or member identity are passed in widget configuration.

Reference: https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/

Validation: `scripts\pnpm.cmd build`, `lint`, `typecheck` passed; `test` 18 passed; `test:integration` 22 passed. Browser coverage includes fixed symbol configuration, offline opt-in, loading failure and retry with a stubbed external script. The external TradingView script could not load in this execution environment, so actual live quotes/rendering have not been verified here. Internet access to TradingView is required.

Final browser command: scripts\pnpm.cmd test:e2e - 33 passed across desktop, iPad and mobile viewports.
