// Research only: no market-data provider, publishing endpoint or trading authority.
export const STRATEGY_VERSION = 'yengfx-body-snr-research-0.1';
export const ENTRY_ZONE_WIDTHS = Object.freeze([7, 8]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const bodyLow = candle => Math.min(candle.open, candle.close);
const bodyHigh = candle => Math.max(candle.open, candle.close);
const candleValid = candle => candle && ['open', 'high', 'low', 'close', 'closedAt'].every(key => finite(candle[key])) && candle.closed === true && candle.low <= bodyLow(candle) && candle.high >= bodyHigh(candle);

/** @typedef {{version: string, mode: string, publishable: boolean, status: string, reasons: string[], side?: string, entryZone?: {low: number, high: number}, entryReference?: number, sl?: number, targets?: {price: number, timeframeMinutes: number}[], tp1RewardRisk?: number, evidenceClosedAt?: number, source?: string, id?: string}} ResearchResult */

/**
 * Evaluates supplied, independently identified evidence; does not detect SNR/QM.
 * Times are epoch milliseconds and timeframes are minutes. No client API uses it.
 * entry is an observation at rejection close, never a promised execution price.
 * @returns {ResearchResult}
 */
export function evaluateResearchSetup(input, now) {
  const result = (status, reasons, extra = {}) => ({
    version: STRATEGY_VERSION, mode: 'RESEARCH_ONLY', publishable: false,
    status, reasons, ...extra,
  });
  if (!input || !finite(now)) return result('REJECTED', ['Invalid evaluation input.']);
  const { side, feed, zone, structure, breakout, retest, rejection, snrCandle, roadblocks } = input;
  if (!['BUY', 'SELL'].includes(side)) return result('REJECTED', ['Invalid direction.']);
  if (!feed || feed.symbol !== 'XAUUSD' || !feed.source || !finite(feed.observedAt) || !finite(feed.maxAgeMs) || feed.maxAgeMs <= 0 || feed.observedAt > now || now - feed.observedAt > feed.maxAgeMs)
    return result('REJECTED', ['Missing, stale or future-dated XAUUSD data.']);
  if (!zone || !finite(zone.low) || !finite(zone.high) || zone.low <= 0 || !finite(zone.timeframeMinutes) || !finite(input.triggerTimeframeMinutes) || input.triggerTimeframeMinutes <= 0 || zone.timeframeMinutes <= input.triggerTimeframeMinutes || !finite(zone.knownAt) || zone.knownAt > now || !ENTRY_ZONE_WIDTHS.some(width => Math.abs(zone.high - zone.low - width) < 0.000001))
    return result('REJECTED', ['Supply a previously identified higher-timeframe zone of $7 or $8 width.']);
  if (!structure || structure.side !== side || structure.confirmed !== true || !finite(structure.confirmedAt) || !finite(structure.zoneTouchedAt) || structure.zoneTouchedAt < zone.knownAt || structure.confirmedAt < structure.zoneTouchedAt || structure.confirmedAt > now)
    return result('WAITING', ['Waiting for zone touch and confirmed lower-timeframe structure shift.']);
  if (!breakout || !candleValid(breakout.candle) || !finite(breakout.level) || !finite(breakout.levelKnownAt) || breakout.levelKnownAt > structure.confirmedAt || breakout.candle.closedAt < structure.confirmedAt || breakout.candle.closedAt > now || !(side === 'BUY' ? breakout.candle.open <= breakout.level && breakout.candle.close > breakout.level : breakout.candle.open >= breakout.level && breakout.candle.close < breakout.level))
    return result('WAITING', ['Waiting for a closed breakout candle crossing the known level.']);
  if (!candleValid(retest) || retest.closedAt <= breakout.candle.closedAt || retest.closedAt > now || retest.low > breakout.level || retest.high < breakout.level)
    return result('WAITING', ['Waiting for a later retest touching the broken level.']);
  if (!candleValid(rejection) || rejection.closedAt < retest.closedAt || rejection.closedAt > now || !(side === 'BUY' ? rejection.close > rejection.open && rejection.close > breakout.level : rejection.close < rejection.open && rejection.close < breakout.level))
    return result('WAITING', ['Waiting for rejection to close in the trade direction.']);
  if (rejection.closedAt !== feed.observedAt)
    return result('REJECTED', ['Evaluate at the latest observed rejection close; old setups cannot be reissued.']);
  if (!candleValid(snrCandle) || snrCandle.closedAt > breakout.candle.closedAt)
    return result('REJECTED', ['Missing a closed SNR candle known before breakout.']);
  const entry = rejection.close;
  const sl = side === 'BUY' ? bodyLow(snrCandle) : bodyHigh(snrCandle);
  const risk = side === 'BUY' ? entry - sl : sl - entry;
  if (entry < zone.low || entry > zone.high || risk <= 0)
    return result('REJECTED', ['Entry is outside the zone or body-based SL is on the wrong side.']);
  if (!Array.isArray(roadblocks) || !finite(input.tickSize) || input.tickSize <= 0 || !finite(input.minimumTp1RewardRisk) || input.minimumTp1RewardRisk <= 0)
    return result('REJECTED', ['Supply roadblocks, tick size and an explicit research reward/risk threshold.']);
  // Body-level observations supplied by a detector/annotator. Never import a
  // level that was not known at this evaluation, or reuse the same tick twice.
  const levels = roadblocks.filter(level => level && finite(level.price) && level.price > 0 && finite(level.knownAt) && level.knownAt <= rejection.closedAt && finite(level.timeframeMinutes) && level.timeframeMinutes >= input.triggerTimeframeMinutes && level.timeframeMinutes <= zone.timeframeMinutes && level.kind === (side === 'BUY' ? 'RESISTANCE' : 'SUPPORT') && (side === 'BUY' ? level.price > entry : level.price < entry));
  levels.sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry));
  const unique = levels.filter((level, index) => index === levels.findIndex(other => Math.round(other.price / input.tickSize) === Math.round(level.price / input.tickSize)));
  if (unique.length < 3) return result('WAITING', ['Three distinct opposing roadblocks are required; targets will not be invented.']);
  const targets = unique.slice(0, 3).map(level => ({ price: level.price, timeframeMinutes: level.timeframeMinutes }));
  const tp1RewardRisk = Math.abs(targets[0].price - entry) / risk;
  if (tp1RewardRisk < input.minimumTp1RewardRisk)
    return result('REJECTED', ['Nearest roadblock leaves insufficient room for the configured research threshold.']);
  return result('CANDIDATE', ['Supplied confirmation sequence passes research checks. Pattern detectors and independent validation remain required.'], {
    side, entryZone: { low: zone.low, high: zone.high }, entryReference: entry, sl,
    targets, tp1RewardRisk, evidenceClosedAt: rejection.closedAt,
    source: feed.source,
    id: `${STRATEGY_VERSION}:${feed.source}:XAUUSD:${side}:${zone.knownAt}:${rejection.closedAt}`,
  });
}
