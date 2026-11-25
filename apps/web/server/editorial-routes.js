import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { isSameOrigin } from './security.js';
import { takeRateLimit } from './rate-limit.js';
import { readBoundedJson } from './request-body.js';
import { jsonResponse } from './http.js';

export const malaysiaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value; }, 'Use a valid calendar date.');
const common = { id: identifier.optional(), version: z.number().int().min(0), title: z.string().trim().min(1).max(120), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) };
const planSchema = z.object({ ...common, planDate: dateSchema, description: z.string().trim().min(1).max(6000), bias: z.enum(['BULLISH', 'BEARISH', 'SIDEWAY']) });
const price = z.string().trim().regex(/^\d{1,7}(?:\.\d{1,3})?$/).refine(value => Number(value) > 0, 'Prices must be positive.');
const units = value => { const [whole, fraction = ''] = value.split('.'); return Number(whole) * 1000 + Number(fraction.padEnd(3, '0')); };
const signalSchema = z.object({ ...common, requestKey: z.uuid(), side: z.enum(['BUY', 'SELL']), category: z.enum(['SCALPING', 'INTERDAY']), zoneLow: price, zoneHigh: price, sl: price, tp1: price, tp2: price, tp3: price, notes: z.string().trim().max(1500).default('') }).refine(row => {
  const low = units(row.zoneLow), high = units(row.zoneHigh), sl = units(row.sl), t1 = units(row.tp1), t2 = units(row.tp2), t3 = units(row.tp3);
  return high > low && (row.side === 'BUY' ? sl < low && t1 > high && t2 > t1 && t3 > t2 : sl > high && t1 < low && t2 < t1 && t3 < t2);
}, 'Zone must have a lower and upper price. SL must be outside the zone; TP1–TP3 must progress away from it in the trade direction.');
const planPublic = { id: true, planDate: true, title: true, description: true, bias: true, status: true, version: true, publishedAt: true, updatedAt: true };
const signalPublic = { id: true, title: true, side: true, category: true, zoneLow: true, zoneHigh: true, sl: true, tp1: true, tp2: true, tp3: true, notes: true, status: true, version: true, publishedAt: true, updatedAt: true, createdAt: true };
const message = (text, status = 200) => jsonResponse({ message: text }, status);
const conflict = () => message('This record changed or already exists. Reload it before saving.', 409);
const snapshot = value => JSON.parse(JSON.stringify(value));
const sameSignal = (record, data) => ['title', 'side', 'category', 'notes', 'status'].every(key => record[key] === data[key]) && ['zoneLow', 'zoneHigh', 'sl', 'tp1', 'tp2', 'tp3'].every(key => Number(record[key]) === Number(data[key]));

export async function editorialApi(request) {
  const url = new URL(request.url), adminRoute = url.pathname.startsWith('/api/admin/');
  const kind = url.pathname.endsWith('/analysis') ? 'analysis' : 'signals';
  if (request.method === 'POST' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return message('Request origin rejected.', 403);
  try {
    const user = await currentUser(request);
    if (!user) return message('Sign in required.', 401);
    if (adminRoute && user.role !== 'ADMIN') return message('Administrator access required.', 403);
    if (!(await takeRateLimit(`editorial:${request.method}`, user.id, request.method === 'GET' ? 90 : 60, 60))) return message('Too many requests. Try again shortly.', 429);
    if (request.method === 'GET') {
      if (kind === 'analysis') {
        const selected = url.searchParams.get('date') ?? (adminRoute ? null : malaysiaDate());
        const before = url.searchParams.get('before');
        if ((selected && !dateSchema.safeParse(selected).success) || (before && !dateSchema.safeParse(before).success)) return message('Invalid plan date.', 400);
        const rows = await db.dailyPlan.findMany({ where: { ...(!adminRoute ? { status: 'PUBLISHED' } : {}), ...(selected ? { planDate: selected } : before ? { planDate: { lt: before } } : {}) }, orderBy: { planDate: 'desc' }, take: 51, select: adminRoute ? undefined : planPublic });
        return jsonResponse({ items: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].planDate : null, today: malaysiaDate() });
      }
      const category = url.searchParams.get('category'), before = url.searchParams.get('before');
      if (category && !['SCALPING', 'INTERDAY'].includes(category)) return message('Invalid signal category.', 400);
      if (before && (!identifier.safeParse(before).success || !await db.manualSignal.findFirst({ where: { id: before, ...(!adminRoute ? { status: 'PUBLISHED' } : {}) }, select: { id: true } }))) return message('Invalid page cursor. Refresh the list.', 400);
      const rows = await db.manualSignal.findMany({ where: { ...(!adminRoute ? { status: 'PUBLISHED' } : {}), ...(category ? { category } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(before ? { cursor: { id: before }, skip: 1 } : {}), select: adminRoute ? undefined : signalPublic });
      return jsonResponse({ items: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null });
    }
    if (request.method !== 'POST' || !adminRoute) return message('Not found.', 404);
    const body = await readBoundedJson(request.body, 32768);
    if (kind === 'analysis') {
      const parsed = planSchema.safeParse(body);
      if (!parsed.success) return message(parsed.error.issues[0].message, 400);
      const { id, version, ...data } = parsed.data;
      const saved = await db.$transaction(async tx => {
        const previous = id ? await tx.dailyPlan.findUnique({ where: { id } }) : null;
        if (id && (!previous || previous.planDate !== data.planDate || previous.version !== version)) return null;
        if (!id && version !== 0) return null;
        const publishedAt = data.status === 'PUBLISHED' ? previous?.publishedAt ?? new Date() : previous?.publishedAt ?? null;
        let item;
        if (id) {
          const changed = await tx.dailyPlan.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 }, publishedAt } });
          if (!changed.count) return null;
          item = await tx.dailyPlan.findUniqueOrThrow({ where: { id } });
        } else item = await tx.dailyPlan.create({ data: { ...data, createdById: user.id, publishedAt } });
        await tx.auditEvent.create({ data: { actorId: user.id, targetId: item.id, action: 'DAILY_PLAN_SAVED', details: { previous: previous ? snapshot(previous) : null, content: snapshot(item) } } });
        return item;
      });
      return saved ? jsonResponse({ item: saved }, id ? 200 : 201) : conflict();
    }
    const parsed = signalSchema.safeParse(body);
    if (!parsed.success) return message(parsed.error.issues[0].message, 400);
    const { id, version, ...data } = parsed.data;
    if (!id && version !== 0) return conflict();
    const replay = item => item.version === 1 && sameSignal(item, data) ? jsonResponse({ item }) : conflict();
    if (!id) { const existing = await db.manualSignal.findUnique({ where: { requestKey: data.requestKey } }); if (existing) return replay(existing); }
    try {
      const saved = await db.$transaction(async tx => {
        const previous = id ? await tx.manualSignal.findUnique({ where: { id } }) : null;
        if (id && (!previous || previous.version !== version || previous.requestKey !== data.requestKey)) return null;
        const publishedAt = data.status === 'PUBLISHED' ? previous?.publishedAt ?? new Date() : previous?.publishedAt ?? null;
        let item;
        if (id) {
          const changed = await tx.manualSignal.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 }, publishedAt } });
          if (!changed.count) return null;
          item = await tx.manualSignal.findUniqueOrThrow({ where: { id } });
        } else item = await tx.manualSignal.create({ data: { ...data, createdById: user.id, publishedAt } });
        await tx.auditEvent.create({ data: { actorId: user.id, targetId: item.id, action: 'MANUAL_SIGNAL_SAVED', details: { previous: previous ? snapshot(previous) : null, content: snapshot(item) } } });
        return item;
      });
      return saved ? jsonResponse({ item: saved }, id ? 200 : 201) : conflict();
    } catch (error) {
      if (!id && error instanceof Error && 'code' in error && error.code === 'P2002') {
        const existing = await db.manualSignal.findUnique({ where: { requestKey: data.requestKey } });
        if (existing) return replay(existing);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'BODY_TOO_LARGE') return message('Request body too large.', 413);
      if (error.message === 'INVALID_JSON') return message('Invalid JSON.', 400);
      if ('code' in error && error.code === 'P2002') return conflict();
    }
    return message('Publishing is temporarily unavailable. Try again shortly.', 503);
  }
}
