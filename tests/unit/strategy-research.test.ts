import { expect, it } from 'vitest';
import { evaluateResearchSetup } from '../../apps/web/server/strategy-research.js';
// Entirely synthetic prices/timestamps. No broker data or performance claims.
const candle = (open: number, close: number, low: number, high: number, closedAt: number) => ({ open, close, low, high, closedAt, closed: true });
const setup = () => ({ side: 'BUY', triggerTimeframeMinutes: 5,
  feed: { symbol: 'XAUUSD', source: 'synthetic-test-only', observedAt: 5000, maxAgeMs: 1000 },
  zone: { low: 100, high: 107, timeframeMinutes: 60, knownAt: 1000 },
  structure: { side: 'BUY', confirmed: true, zoneTouchedAt: 2000, confirmedAt: 2500 },
  breakout: { level: 103, levelKnownAt: 2200, candle: candle(102, 104, 101, 105, 3000) },
  retest: candle(104, 103, 102, 105, 4000), rejection: candle(103, 104, 102, 105, 5000),
  snrCandle: candle(101, 102, 98, 103, 2000), tickSize: 0.01, minimumTp1RewardRisk: 1,
  roadblocks: [110, 108, 112].map((price, i) => ({ price, knownAt: 2000, timeframeMinutes: [30, 5, 60][i], kind: 'RESISTANCE' })),
});
it('uses body SL, nearest multi-timeframe targets and never permits publishing', () => {
  const result = evaluateResearchSetup(setup(), 5000);
  expect(result.status).toBe('CANDIDATE');
  expect(result.sl).toBe(101); // wick low98 is excluded
  expect(result.targets?.map(t => t.price)).toEqual([108, 110, 112]);
  expect(result.publishable).toBe(false);
  expect(evaluateResearchSetup(setup(), 5000).id).toBe(result.id);
});
it('waits for every confirmation in sequence', () => {
  for (const field of ['structure', 'breakout', 'retest', 'rejection'] as const) {
    const input = { ...setup(), [field]: null };
    expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
  }
  const input = setup(); input.retest.closedAt = 3000;
  expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
});
it('rejects stale data, invalid zones and chasing price', () => {
  expect(evaluateResearchSetup(setup(), 7000).status).toBe('REJECTED');
  const input = setup(); input.zone.high = 106;
  expect(evaluateResearchSetup(input, 5000).status).toBe('REJECTED');
  input.zone.high = 107; input.rejection.close = 108; input.rejection.high = 109;
  expect(evaluateResearchSetup(input, 5000).status).toBe('REJECTED');
});
it('does not borrow future roadblocks or duplicate targets', () => {
  const input = setup(); input.roadblocks[0].knownAt = 6000;
  expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
  input.roadblocks[0] = { ...input.roadblocks[1] };
  expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
});
it('mirrors the body stop and target order for SELL', () => {
  const input = setup();
  input.side = 'SELL'; input.structure.side = 'SELL';
  input.breakout.candle = candle(104, 102, 101, 105, 3000);
  input.retest = candle(102, 103, 101, 104, 4000);
  input.rejection = candle(103, 102, 101, 104, 5000);
  input.snrCandle = candle(104, 105, 103, 109, 2000);
  input.roadblocks = [96, 98, 94].map(price => ({ price, knownAt: 2000, timeframeMinutes: 15, kind: 'SUPPORT' }));
  const result = evaluateResearchSetup(input, 5000);
  expect(result.status).toBe('CANDIDATE'); expect(result.sl).toBe(105);
  expect(result.targets?.map(t => t.price)).toEqual([98, 96, 94]);
});
it('never confirms an open candle or a zone learned after the interaction', () => {
  const input = setup(); input.rejection.closed = false;
  expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
  input.rejection.closed = true; input.zone.knownAt = 2600;
  expect(evaluateResearchSetup(input, 5000).status).toBe('WAITING');
});
it('rejects wrong-side stops and inadequate first roadblock reward', () => {
  const input = setup(); input.snrCandle = candle(105, 106, 104, 107, 2000);
  expect(evaluateResearchSetup(input, 5000).status).toBe('REJECTED');
  input.snrCandle = candle(101, 102, 98, 103, 2000);
  input.minimumTp1RewardRisk = 2;
  expect(evaluateResearchSetup(input, 5000).status).toBe('REJECTED');
});
