import { afterEach, beforeEach, expect, it } from 'vitest';
import { createUsdtApi, matchTransfer, newAccessUntil, USDT_CONTRACT } from '../../apps/web/server/usdt-payments.js';
import { liveSnapshot } from '../../apps/web/server/broker-routes.js';

const wallet = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
const created = new Date('2026-11-28T10:00:00Z'), expires = new Date('2026-11-28T11:00:00Z');
const invoice = { id: 'inv1', plan: 'MONTHLY', amountMicro: 10_370_000, createdAt: created, expiresAt: expires, status: 'PENDING' };
const transfer = (over = {}) => ({ type: 'Transfer', token_info: { address: USDT_CONTRACT }, to: wallet, value: '10370000', block_timestamp: +created + 60_000, transaction_id: 'a'.repeat(64), ...over });

it('matches only an exact USDT amount sent to our wallet inside the open window', () => {
  expect(matchTransfer([transfer()], invoice, wallet)?.transaction_id).toBe('a'.repeat(64));
  expect(matchTransfer([transfer({ value: '10000000' })], invoice, wallet)).toBeNull();
  expect(matchTransfer([transfer({ to: 'TOther000000000000000000000000000' })], invoice, wallet)).toBeNull();
  expect(matchTransfer([transfer({ token_info: { address: 'TFakeToken' } })], invoice, wallet)).toBeNull();
  expect(matchTransfer([transfer({ block_timestamp: +created - 1 })], invoice, wallet)).toBeNull();
  expect(matchTransfer([transfer({ block_timestamp: +expires + 1 })], invoice, wallet)).toBeNull();
});

it('adds paid time on top of remaining paid time; lifetime has no end', () => {
  const now = new Date('2026-11-28T00:00:00Z'), day = 86400000;
  expect(+newAccessUntil('MONTHLY', null, now)!).toBe(+now + 30 * day);
  expect(+newAccessUntil('YEARLY', { plan: 'MONTHLY', accessUntil: new Date(+now + 10 * day) }, now)!).toBe(+now + 375 * day);
  expect(+newAccessUntil('MONTHLY', { plan: 'MONTHLY', accessUntil: new Date(+now - day) }, now)!).toBe(+now + 30 * day);
  expect(newAccessUntil('LIFETIME', null, now)).toBeNull();
});

const env = { ...process.env };
beforeEach(() => { process.env.USDT_TRC20_ADDRESS = wallet; process.env.APP_ORIGIN = 'https://yenqo.example'; });
afterEach(() => { process.env = { ...env }; });
const post = (path: string, body: object) => new Request('https://yenqo.example' + path, { method: 'POST', headers: { origin: 'https://yenqo.example', 'content-type': 'application/json' }, body: JSON.stringify(body) });

it('activates the plan once when the chain shows the payment, and refuses to reuse it', async () => {
  const saved: any[] = [];
  let state = 'PENDING';
  const tx = {
    cryptoInvoice: { updateMany: async () => { if (state === 'PAID') return { count: 0 }; state = 'PAID'; return { count: 1 }; } },
    membership: { findUnique: async () => null, upsert: async (args: any) => saved.push(args) },
    auditEvent: { create: async () => ({}) },
  };
  const database: any = { cryptoInvoice: { findMany: async () => (state === 'PAID' ? [] : [invoice]) }, $transaction: (fn: any) => fn(tx) };
  const fetcher: any = async (url: URL) => { expect(url.hostname).toBe('api.trongrid.io'); return new Response(JSON.stringify({ data: [transfer()] })); };
  const api = createUsdtApi({ database, principal: (async () => ({ id: 'u1', membership: null })) as any, rateLimit: async () => true, fetcher });
  const first = await (await api(post('/api/payments/usdt/check', {}))).json();
  expect(first.paid).toBe(true);
  expect(saved[0].create).toMatchObject({ userId: 'u1', plan: 'MONTHLY' });
  expect((await api(post('/api/payments/usdt/check', {}))).status).toBe(404);
});

it('rejects cross-site requests and unknown plans', async () => {
  const api = createUsdtApi({ database: {} as any, principal: (async () => ({ id: 'u1', membership: null })) as any, rateLimit: async () => true });
  expect((await api(new Request('https://yenqo.example/api/payments/usdt', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }))).status).toBe(403);
  const database: any = { cryptoInvoice: { findFirst: async () => null } };
  const api2 = createUsdtApi({ database, principal: (async () => ({ id: 'u1', membership: null })) as any, rateLimit: async () => true });
  expect((await api2(post('/api/payments/usdt', { plan: 'FREE' }))).status).toBe(400);
});

it('shapes live MT5 data: sorted candles, only this symbol\'s positions, 0 stop treated as none', () => {
  const snap = liveSnapshot({
    info: { currency: 'USD', balance: 1000, equity: 990, margin: 20 },
    candles: [{ time: '2026-11-28T10:15:00Z', open: 2, high: 3, low: 1, close: 2.5 }, { time: '2026-11-28T10:00:00Z', open: 1, high: 2, low: 0.5, close: 2 }, { time: 'bad', open: 1 }],
    positions: [{ symbol: 'XAUUSD', type: 'POSITION_TYPE_SELL', volume: 0.1, openPrice: 4000, stopLoss: 0, takeProfit: 3990, profit: -10 }, { symbol: 'EURUSD', type: 'POSITION_TYPE_BUY', volume: 1, openPrice: 1.1, profit: 5 }],
  }, 'XAUUSD');
  expect(snap.candles.map((c: any) => c.open)).toEqual([1, 2]);
  expect(snap.positions).toEqual([expect.objectContaining({ side: 'SELL', openPrice: 4000, stopLoss: null, takeProfit: 3990 })]);
  expect(snap.account).toMatchObject({ floating: -5, openPositions: 2 });
});
