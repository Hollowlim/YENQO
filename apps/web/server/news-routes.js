import { z } from 'zod';
import { currentUser } from './auth.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { DEFAULT_NEWS_RULES, isMajorUsdEvent, newsGuard } from './news-guard.js';

export const NEWS_REFERENCE_URL = 'https://www.forexfactory.com/calendar';
const value = z.string().trim().max(40).nullable();
const eventSchema = z.object({ id: z.string().max(100), title: z.string().trim().min(1).max(200), currency: z.string().regex(/^[A-Z]{3}$/), impact: z.enum(['HIGH', 'MEDIUM', 'LOW']), time: z.iso.datetime({ offset: true }), forecast: value, previous: value, actual: value });
// Licensed calendar adapters register here as name -> async () => events[] (eventSchema shape).
// None ship by default: Forex Factory is an external reference link, not a scraped data source.
export const NEWS_PROVIDERS = Object.freeze({});
const minutes = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 1440 ? parsed : fallback;
};
export const newsRules = () => ({
  pauseBeforeMinutes: minutes('NEWS_PAUSE_BEFORE_MINUTES', DEFAULT_NEWS_RULES.pauseBeforeMinutes),
  resumeAfterMinutes: minutes('NEWS_RESUME_AFTER_MINUTES', DEFAULT_NEWS_RULES.resumeAfterMinutes),
  maxFeedAgeMinutes: minutes('NEWS_MAX_FEED_AGE_MINUTES', DEFAULT_NEWS_RULES.maxFeedAgeMinutes),
});

export function createNewsApi({ providerName = process.env.NEWS_PROVIDER ?? '', provider = NEWS_PROVIDERS[providerName], now = () => new Date(), principal = currentUser, rateLimit = takeRateLimit } = {}) {
  let cache = null;
  return async request => {
    try {
      if (request.method !== 'GET') return jsonResponse({ message: 'Method not allowed.' }, 405);
      const user = await principal(request);
      if (!user) return jsonResponse({ message: 'Sign in required.' }, 401);
      if (!(await rateLimit('news', user.id, 60, 60))) return jsonResponse({ message: 'Too many requests. Try again shortly.' }, 429);
      const rules = newsRules();
      const base = { reference: NEWS_REFERENCE_URL, rules, timeZone: 'Asia/Kuala_Lumpur' };
      if (!provider) return jsonResponse({ ...base, status: providerName ? 'misconfigured' : 'unavailable', provider: null, events: [], fetchedAt: null, guard: newsGuard({ events: null, fetchedAt: null, now: now(), rules }) });
      let status = 'ok';
      if (!cache || now().getTime() - cache.fetchedAt.getTime() > 5 * 60000) {
        try {
          const events = z.array(eventSchema).max(2000).parse(await provider());
          cache = { fetchedAt: now(), events: events.filter(event => event.currency === 'USD' && event.impact !== 'LOW').sort((a, b) => Date.parse(a.time) - Date.parse(b.time)) };
        } catch {
          status = 'error'; // Keep the previous snapshot; the guard marks it stale once it ages out.
        }
      }
      if (!cache) return jsonResponse({ ...base, status: 'error', provider: providerName, events: [], fetchedAt: null, guard: newsGuard({ events: null, fetchedAt: null, now: now(), rules }) });
      const from = now().getTime() - 86400000, to = now().getTime() + 7 * 86400000;
      const events = cache.events.filter(event => Date.parse(event.time) >= from && Date.parse(event.time) <= to).map(event => ({ ...event, major: isMajorUsdEvent(event) }));
      return jsonResponse({ ...base, status, provider: providerName, events, fetchedAt: cache.fetchedAt, guard: newsGuard({ events: cache.events, fetchedAt: cache.fetchedAt, now: now(), rules }) });
    } catch {
      return jsonResponse({ message: 'News is temporarily unavailable.' }, 503);
    }
  };
}
export const newsApi = createNewsApi();
