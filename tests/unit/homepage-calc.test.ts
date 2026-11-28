import { expect, it } from 'vitest';
import { goldLotSize, sessionState } from '../../apps/web/public/homepage-calc.js';

it('sizes gold trades rounded down so the loss never exceeds the risk', () => {
  expect(goldLotSize(10000, 1, 20)).toMatchObject({ risk: 100, lots: 0.5, loss: 100, pipValue: 5 });
  const odd = goldLotSize(1000, 1, 30)!; // 10 / 300 = 0.0333 lots
  expect(odd.lots).toBe(0.03);
  expect(odd.loss).toBeLessThanOrEqual(odd.risk);
  expect(goldLotSize(100, 1, 50)!.lots).toBe(0); // below 0.01 lots: page tells the user instead of rounding up
  for (const bad of [[0, 1, 20], [1000, -1, 20], [1000, 101, 20], [1000, 1, NaN]]) expect(goldLotSize(...(bad as [number, number, number]))).toBeNull();
});

it('marks sessions open by UTC hour and closes everything at the weekend', () => {
  const open = (iso: string) => sessionState(new Date(iso)).filter((s) => s.isOpen).map((s) => s.name);
  expect(open('2026-11-25T14:00:00Z')).toEqual(['London', 'New York']); // Wednesday overlap
  expect(open('2026-11-25T23:00:00Z')).toEqual(['Sydney']);
  expect(open('2026-11-28T14:00:00Z')).toEqual([]); // Saturday
  expect(open('2026-11-29T21:30:00Z')).toEqual(['Sydney']); // Sunday reopen
});

it('keeps overnight sessions shut from Friday close until Sunday reopen', () => {
  const open = (iso: string) => sessionState(new Date(iso)).filter((s) => s.isOpen).map((s) => s.name);
  expect(open('2026-11-27T21:30:00Z')).toEqual(['New York']); // Friday evening: Sydney does not reopen
  expect(open('2026-11-30T03:00:00Z')).toEqual(['Sydney', 'Tokyo']); // Monday morning Asia
  expect(open('2026-11-27T23:00:00Z')).toEqual([]); // Friday after close
});
