import {randomInt} from 'node:crypto';
import {z} from 'zod';
import {db} from './db.js';
import {currentUser} from './auth.js';
import {isSameOrigin} from './security.js';
import {takeRateLimit} from './rate-limit.js';
import {readBoundedJson} from './request-body.js';
import {jsonResponse} from './http.js';

// USDT on Tron (TRC20). Each payment request gets a unique cent amount, so the
// amount that arrives in the wallet tells us who paid. Nobody types a TxID.
export const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
export const PRICES_MICRO = Object.freeze({MONTHLY: 10_000_000, YEARLY: 100_000_000, LIFETIME: 400_000_000});
const INVOICE_MS = 60 * 60 * 1000, DAY = 86400000;
export const walletAddress = () => {
  const value = process.env.USDT_TRC20_ADDRESS?.trim();
  return value && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value) ? value : null;
};
const planSchema = z.object({plan: z.enum(['MONTHLY', 'YEARLY', 'LIFETIME'])}).strict();
const publicInvoice = row => row ? {plan: row.plan, amount: (row.amountMicro / 1e6).toFixed(2), status: row.status, expiresAt: row.expiresAt} : null;

/** A confirmed USDT transfer to our wallet with the invoice's exact amount, sent while it was open. */
export function matchTransfer(transfers, invoice, wallet) {
  return transfers.find(t => t?.type === 'Transfer' && t.token_info?.address === USDT_CONTRACT && t.to === wallet
    && t.value === String(invoice.amountMicro) && typeof t.block_timestamp === 'number'
    && t.block_timestamp >= +new Date(invoice.createdAt) && t.block_timestamp <= +new Date(invoice.expiresAt)
    && typeof t.transaction_id === 'string' && /^[0-9a-f]{64}$/.test(t.transaction_id)) ?? null;
}
/** Paid time adds on to time already paid for; lifetime has no end date. */
export function newAccessUntil(plan, membership, now = new Date()) {
  if (plan === 'LIFETIME') return null;
  const current = ['MONTHLY', 'YEARLY'].includes(membership?.plan) && membership.accessUntil ? new Date(membership.accessUntil) : null;
  const base = current && current > now ? current : now;
  return new Date(+base + (plan === 'MONTHLY' ? 30 : 365) * DAY);
}
async function tronTransfers(wallet, since, fetcher) {
  // shortcut: reads the first 200 transfers after the oldest open request; page with meta.fingerprint if the wallet gets busier.
  const url = new URL(`https://api.trongrid.io/v1/accounts/${wallet}/transactions/trc20`);
  url.search = new URLSearchParams({only_to: 'true', only_confirmed: 'true', contract_address: USDT_CONTRACT, min_timestamp: String(+since), limit: '200'}).toString();
  const headers = new Headers({Accept: 'application/json'});
  if (process.env.TRONGRID_API_KEY) headers.set('TRON-PRO-API-KEY', process.env.TRONGRID_API_KEY);
  const response = await fetcher(url, {headers, redirect: 'error', signal: globalThis.AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('CHAIN_UNAVAILABLE');
  const body = await response.json();
  return Array.isArray(body?.data) ? body.data : [];
}

export function createUsdtApi({database = db, principal = currentUser, rateLimit = takeRateLimit, fetcher = fetch} = {}) {
  return async function usdtApi(request) {
    const path = new URL(request.url).pathname, now = new Date();
    try {
      if (request.method !== 'GET' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return jsonResponse({message: 'Request origin rejected.'}, 403);
      const user = await principal(request);
      if (!user) return jsonResponse({message: 'Sign in required.'}, 401);
      const wallet = walletAddress();
      if (path === '/api/payments/usdt' && request.method === 'GET') {
        if (!await rateLimit('usdt:GET', user.id, 60, 60)) return jsonResponse({message: 'Too many requests. Try again shortly.'}, 429);
        const invoice = await database.cryptoInvoice.findFirst({where: {userId: user.id, status: 'PENDING', expiresAt: {gt: now}}, orderBy: {createdAt: 'desc'}});
        return jsonResponse({configured: Boolean(wallet), network: 'TRC20', wallet, invoice: publicInvoice(invoice)});
      }
      if (request.method !== 'POST') return jsonResponse({message: 'Method not allowed.'}, 405);
      if (!wallet) return jsonResponse({message: 'USDT payment is not set up yet.'}, 503);
      if (path === '/api/payments/usdt') {
        if (!await rateLimit('usdt:create', user.id, 10, 60)) return jsonResponse({message: 'Too many requests. Try again shortly.'}, 429);
        const parsed = planSchema.safeParse(await readBoundedJson(request.body, 1024));
        if (!parsed.success) return jsonResponse({message: 'Choose Monthly, Yearly or Lifetime.'}, 400);
        const {plan} = parsed.data;
        if (user.membership?.plan === 'LIFETIME') return jsonResponse({message: 'You already have lifetime access.'}, 409);
        const open = await database.cryptoInvoice.findFirst({where: {userId: user.id, status: 'PENDING', plan, expiresAt: {gt: now}}, orderBy: {createdAt: 'desc'}});
        if (open) return jsonResponse({invoice: publicInvoice(open), wallet, network: 'TRC20'});
        // Expired requests release their amount for reuse; their payment window is already closed.
        await database.cryptoInvoice.updateMany({where: {status: 'PENDING', OR: [{expiresAt: {lte: now}}, {userId: user.id}]}, data: {status: 'EXPIRED', openAmount: null}});
        for (let attempt = 0; attempt < 8; attempt++) {
          const amountMicro = PRICES_MICRO[plan] + randomInt(1, 100) * 10_000;
          try {
            const invoice = await database.cryptoInvoice.create({data: {userId: user.id, plan, amountMicro, openAmount: amountMicro, expiresAt: new Date(+now + INVOICE_MS)}});
            return jsonResponse({invoice: publicInvoice(invoice), wallet, network: 'TRC20'}, 201);
          } catch (/** @type {any} */ error) { if (error?.code !== 'P2002') throw error; }
        }
        return jsonResponse({message: 'Many payments are open right now. Try again in a few minutes.'}, 503);
      }
      if (path === '/api/payments/usdt/check') {
        if (!await rateLimit('usdt:check', user.id, 6, 60)) return jsonResponse({message: 'Checked recently. Wait a minute and try again.'}, 429);
        const invoices = await database.cryptoInvoice.findMany({where: {userId: user.id, status: {in: ['PENDING', 'EXPIRED']}, createdAt: {gt: new Date(+now - DAY)}}, orderBy: {createdAt: 'desc'}, take: 5});
        if (!invoices.length) return jsonResponse({message: 'No payment request found. Choose a plan first.'}, 404);
        const transfers = await tronTransfers(wallet, new Date(Math.min(...invoices.map(i => +i.createdAt))), fetcher);
        for (const invoice of invoices) {
          const transfer = matchTransfer(transfers, invoice, wallet);
          if (!transfer) continue;
          await database.$transaction(async tx => {
            const claimed = await tx.cryptoInvoice.updateMany({where: {id: invoice.id, status: {in: ['PENDING', 'EXPIRED']}}, data: {status: 'PAID', openAmount: null, txHash: transfer.transaction_id, paidAt: now}});
            if (!claimed.count) throw new Error('ALREADY_PAID');
            const membership = await tx.membership.findUnique({where: {userId: user.id}});
            const accessUntil = newAccessUntil(invoice.plan, membership, now);
            await tx.membership.upsert({where: {userId: user.id}, create: {userId: user.id, plan: invoice.plan, accessUntil}, update: {plan: invoice.plan, accessUntil, version: {increment: 1}}});
            await tx.auditEvent.create({data: {actorId: user.id, targetId: user.id, action: 'USDT_PAYMENT_CONFIRMED', details: {plan: invoice.plan, amountMicro: invoice.amountMicro, txHash: transfer.transaction_id}}});
          });
          return jsonResponse({paid: true, plan: invoice.plan, message: 'Payment received. Your plan is active.'});
        }
        return jsonResponse({paid: false, message: 'Payment not found yet. Transfers take 1–3 minutes to confirm. Check again shortly.'});
      }
      return jsonResponse({message: 'Not found.'}, 404);
    } catch (/** @type {any} */ error) {
      if (error?.code === 'P2002' || error?.message === 'ALREADY_PAID') return jsonResponse({message: 'This payment was already used.'}, 409);
      if (error?.message === 'BODY_TOO_LARGE') return jsonResponse({message: 'Request too large.'}, 413);
      if (error?.message === 'INVALID_JSON') return jsonResponse({message: 'Request must contain valid JSON.'}, 400);
      return jsonResponse({message: 'Payment check is temporarily unavailable. Nothing was charged by this page.'}, 503);
    }
  };
}
export const usdtApi = createUsdtApi();
