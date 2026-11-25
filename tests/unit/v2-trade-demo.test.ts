import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const scope: any = { structuredClone };
runInNewContext(readFileSync('apps/web/public/v2-trade-model.js', 'utf8'), scope);
const model = scope.YengfxTradeDemo;
it('starts with conspicuously synthetic positions and no connection', () => {
  const s = model.initial(); expect(s.connected).toBe(false); expect(s.positions.length).toBe(4);
});
it('previews secure as eligible volume and orders BUY higher entry first', () => {
  const s = model.initial(); const p = model.preview(s, 'secure', { percent: 50, side: 'BUY' }, 1000, 'one');
  expect(p.volume).toBe(0.02); expect(p.changes[0].id).toBe('DEMO-B2');
  expect(s.positions).toHaveLength(4);
});
it('orders SELL lower entry first and never closes sub-step volume', () => {
  const s = model.initial(); const p = model.preview(s, 'secure', { percent: 50, side: 'SELL' }, 1000, 'one');
  expect(p.changes[0].id).toBe('DEMO-S2'); expect(p.volume).toBe(0.02);
  expect(() => model.preview(s, 'secure', { percent: 25, positionId: 'DEMO-B2' }, 1000, 'small')).toThrow();
});
it('requires matching revision, unexpired preview and single confirmation', () => {
  const s = model.initial(), p = model.preview(s, 'close-all', {}, 1000, 'one');
  expect(() => model.confirm(s, p, 40001)).toThrow();
  const done = model.confirm(s, p, 1001); expect(done.state.positions).toHaveLength(0); expect(done.receipt.status).toBe('SIMULATED_COMPLETED');
  expect(() => model.confirm(done.state, p, 1002)).toThrow();
});
it('validates exact prices and pip inputs before a preview', () => {
  const s = model.initial();
  for (const value of [0, -1, NaN, Infinity]) expect(() => model.preview(s, 'set-tp', { value, mode: 'price' }, 1, 'bad')).toThrow();
  expect(() => model.preview(s, 'set-sl', { value: 1, mode: 'unknown' }, 1, 'bad')).toThrow();
});
it('applies pip offsets by direction only to selected positions', () => {
  const s = model.initial(), p = model.preview(s, 'set-tp', { value: 50, mode: 'pips', positionId: 'DEMO-S1' }, 1, 'tp');
  const next = model.confirm(s, p, 2).state;
  expect(next.positions.find((p: any) => p.id === 'DEMO-S1').tp).toBe(2995);
  expect(next.positions.find((p: any) => p.id === 'DEMO-B1').tp).toBeNull();
});
it('cannot target an arbitrary account or unknown position', () => {
  expect(() => model.preview(model.initial(), 'close-position', { positionId: 'real-account' }, 1, 'x')).toThrow();
  expect(() => model.preview(model.initial(), 'unknown', {}, 1, 'x')).toThrow();
});
it('cancel pending changes only simulated orders and issues a labelled receipt', () => {
  const s = model.initial(), p = model.preview(s, 'cancel-pending', {}, 1, 'cancel');
  const result = model.confirm(s, p, 2);
  expect(result.state.pendingOrders).toBe(0); expect(result.state.positions).toHaveLength(4);
  expect(result.receipt.id).toBe('cancel'); expect(result.receipt.brokerAcknowledged).toBe(false);
});
