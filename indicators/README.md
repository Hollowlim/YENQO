# YENGFX XAUUSD indicator: create, compare, then test

This is a new **Pine Script v6 research prototype**, created from scratch. It is not a finished client-signal product and has no verified performance. It does not execute trades or publish signals to YENGFX HUB.

## Open the indicator

1. Open `yengfx-xauusd-prototype.pine` in your editor and copy the full file.
2. On the TradingView website, open **OANDA:XAUUSD** and select standard time-based candles, M1 or higher. Common chart timeframes through monthly are supported; a strictly higher zone timeframe must remain available.
3. Open **Pine Editor**, create a new indicator, replace its contents with the file, save it as **YENGFX Research v0.2**, and choose **Add to chart**.
4. Use the indicator settings to choose your higher timeframe (default H1), 70/80-pip zone width and pivot confirmation sensitivity.
5. If TradingView reports a compilation error, send its exact error and line number. No Pine compiler or authenticated TradingView editor is available in this workspace, so TradingView compilation is still unverified.

The website's embedded TradingView widget does not automatically run this custom script. Test it in your own TradingView chart first. No browser credentials are required by the repository.

## What v0.1 does

- Shows the latest confirmed higher-timeframe support and resistance **body-pivot** zones, $7 or $8 wide.
- Looks for lower highs/lower lows before a bullish structure break, or higher highs/higher lows before a bearish break. The breakout must close through the frozen body-swing level, on a bar after zone touch.
- Waits for a later retest touching the broken level and a candle closing in the trade direction. Retest and rejection may be the same candle.
- Places a research SL at the frozen lower-timeframe body-pivot boundary, excluding wicks in selecting that boundary. Any subsequent price touch of the SL still invalidates the setup.
- Selects the nearest three distinct opposing body-pivot levels from M5/M15/M30/H1, omitting timeframes higher than the selected zone timeframe. It retains the latest two levels per timeframe, not every historical zone.
- Rejects candidates outside the original entry zone, missing three targets, or below the configurable TP1 reward/risk threshold. Default 1.0 is a research starting value, not an optimized setting.
- Expires setups after a configurable number of chart bars; consumes each direction's zone once per run. Changing settings or loaded history recalculates that history, so this is not a server idempotency guarantee.
- Labels candidates **RESEARCH**, with entry reference, SL and TP1–TP3. The latest plan plots are historical reference, not proof of an active signal or a fill.

Scalping/Interday is a manual label in this prototype, not an automatic classifier. The prototype monitors one effective higher timeframe and uses the current chart for confirmation. It does not scan every timeframe simultaneously.

## v0.2 timeframe correction

The reported bar-0 error was the explicit M1–M5 runtime guard in v0.1, not a syntax error. v0.2 removes that restriction. The preferred zone defaults to H1: M15 and M30 charts keep H1 zones; an H1 chart automatically uses H4 zones; H4 uses daily; daily uses weekly; weekly uses monthly; monthly uses 3M. The panel displays the effective confirmation and zone timeframes. An explicitly selected valid higher zone is preserved. Sub-minute/non-time charts and configurations without an available higher timeframe remain unsupported.

Roadblock slots below the chart timeframe now fall back to confirmed chart-timeframe pivots, with duplicates removed. The effective HTF zone's opposing pivots are also included. This does not reconstruct M5 intrabars on an H1 chart. Use M5 to retain the original M5/M15/M30/H1 roadblock combination. All request expressions retain the completed-bar offset. Actual Pine v0.2 compilation and runtime testing still require TradingView; local JS checks are not Pine verification.

## Provisional definitions to compare with your technique

Body pivots are a transparent starting detector, not a claim to reproduce every Malaysian SNR variation. A pivot needs `pivotBars` candles on both sides; it becomes known only after the right-hand candles close. Higher-timeframe information is additionally delayed by one completed higher-timeframe bar. This can make zones appear later than you would draw them manually.

The last relevant SNR candle is provisionally represented by the last confirmed body pivot at zone touch. The breakout also serves as the observed structure shift, after a prior opposing sequence; these are not two independently implemented detectors. QM, separate trendline detection, volume profile and an AI model are **not implemented**. SBR/RBS is represented only by the broken-level retest. Compare these definitions visually before adding complexity.

The implementation follows TradingView's documented [confirmed higher-timeframe request pattern](https://www.tradingview.com/pine-script-docs/concepts/repainting/) using offset expressions with `lookahead_on`; signals require chart candle closure. This is a design choice to prevent future-data leakage, not a verified non-repainting certification.

## First test: visual Bar Replay

1. Compile first. Confirm the expected chart symbol and timeframe guards work.
2. Use Bar Replay on a past period; move forward one candle at a time. Avoid choosing only attractive setups.
3. Record at least 20 consecutive zone interactions, including rejected/missed cases, across both BUY and SELL. This is an initial behavior check, not a sufficient performance sample.
4. For each interaction, check when the zone actually became available, body boundary, zone width, structure break, retest and rejection. A candidate must never appear before its rejection candle closes.
5. Check each SL against the intended SNR body and each target against the nearest opposing roadblocks. Record disagreements instead of optimizing them away.
6. Reload the same chart with the same history/settings and compare closed-bar markers. Record any changed markers and the data/history differences.
7. Record spread, source, timezone, dates and settings. Entry reference is rejection close; it is not an executable bid/ask quote. No profit calculation is provided.

Use `replay-log.csv` to record actual observations. Its blank rows contain no invented results. Do not send prototype alerts to clients. A later strategy/backtest implementation must include costs, intrabar ambiguity, out-of-sample data and real paper-trading evidence before release.

## Validation in this workspace

The JavaScript research evaluator has seven synthetic scenarios in the existing 25-test unit suite. It is a separate implementation and those tests **do not compile or validate the Pine script**. Pine compilation, real Bar Replay and performance testing remain pending in TradingView.
