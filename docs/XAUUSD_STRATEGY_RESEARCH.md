# YENGFX XAUUSD strategy: research foundation

## Confirmed owner rules

- Higher timeframes supply zones; lower timeframes supply market structure and breakout confirmation. No fixed timeframe pair is imposed.
- Entry-zone width is 70 or 80 pips, with the owner's confirmed convention of 0.10 USD per pip: $7 or $8 of XAUUSD price movement.
- Require zone interaction, a lower-timeframe structure shift and breakout candle close, followed by a retest touching the broken level and a rejection candle closing in the trade direction.
- SL uses the relevant last SNR candle's body boundary: lower body edge for BUY, upper edge for SELL. Wicks are excluded from the SNR stop.
- Targets are the nearest opposing roadblocks by price distance across applicable timeframes. For the owner's H1 example these include M5, M15, M30 and H1. BUY uses resistance; SELL uses support. TP1, TP2 and TP3 are the first three distinct levels.
- Strategy context includes Malaysian SNR, SBR/RBS, QM, trendlines, market structure and volume profile.

## Implemented research module

`apps/web/server/strategy-research.js` evaluates supplied annotated evidence. It checks the required sequence, candle closure, higher/lower timeframe ordering, data freshness, known-at timestamps, zone width, body-based stop placement and target direction/order. Repeated evaluation has a stable candidate ID. It rejects entries outside the original zone and never invents missing targets.

Every result is `RESEARCH_ONLY` and `publishable: false`. Nothing calls this module from client signal routes. There are no new endpoints, credentials, automatic client recommendations or broker actions. This is a tested evaluation foundation, not a finished automatic indicator or a validated trading system.

## Explicit research choices, not claimed owner rules

The reference entry is the rejection close, not a guaranteed fill. A candle must cross the breakout level from its open to its close. A retest must follow the breakout; the rejection may be that retest candle. The supplied SNR candle must already be closed before breakout. Duplicate levels are grouped by supplied broker tick size. The caller supplies a minimum TP1 reward/risk threshold; no profitable default is claimed. These choices need chart-example comparison before indicator release.

## Work required for a usable indicator and client analysis

1. Supply the existing indicator source if available, or annotate representative BUY, SELL and rejected setups. Formalize exactly how Malaysian SNR candles/zones, structure swings, QM, trendlines and SBR/RBS are identified. These names alone do not specify an algorithm.
2. Select and connect an authorized OHLC feed with symbol specifications, closed-candle timestamps and volume provenance. Broker tick volume must not be called exchange volume. Volume profile requires an agreed source and construction method.
3. Implement and compare individual detectors against the annotated examples, using only information available at each candle close. Confirmed pivots must retain their detection time rather than being presented as known on the pivot candle.
4. Add a historical replay/backtest with chronological train/test separation, spread, slippage, commissions, broker tick/stop constraints, expiry and duplicate-signal handling. If SL and TP are both touched within one bar, use lower-timeframe evidence or mark the outcome ambiguous.
5. Validate on unseen data and paper signals. Report sample size, losses, drawdown and uncertainty; never manufacture a win rate or label the system strong based on synthetic tests.
6. Add an authenticated, audited signal-ingestion service with versioned provenance and a disabled-by-default release switch. AI explanations must cite detector evidence and cannot invent or override levels. The current TradingView widget is a chart display, not an analysis data API or a place where this custom indicator automatically runs.

Until those steps are complete, client Signals correctly remains unpublished. No live MT5 trading is enabled.

## Checks

Synthetic unit scenarios cover BUY and SELL body stops, roadblock ordering, missing/out-of-order confirmations, stale data, invalid zone width, chasing price, future levels and duplicate targets. These tests establish software behavior only, not trading performance.

- `scripts\pnpm.cmd test`: 25 tests passed (including seven research scenarios).
- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd build`: passed, 30 screens exported and 33 HTML documents validated.

No browser or HTTP behavior was added by this module; previous browser results are not claimed as indicator validation. No real market replay or backtest has been run.
