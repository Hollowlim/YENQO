// Pure news-protection rules. Missing or stale calendar data never yields a clear state.
export const MAJOR_USD_EVENT = /\b(non-?farm|nfp|cpi|consumer price|fomc|federal funds|fed (?:chair|interest)|pce|gdp|unemployment rate|retail sales|ism)\b/i;
export const DEFAULT_NEWS_RULES = Object.freeze({ pauseBeforeMinutes: 30, resumeAfterMinutes: 30, maxFeedAgeMinutes: 60 });

export const isMajorUsdEvent = event => event.currency === 'USD' && MAJOR_USD_EVENT.test(event.title);

/**
 * @param {{events: {title:string,currency:string,impact:string,time:string}[]|null, fetchedAt: Date|string|null, now?: Date, rules?: typeof DEFAULT_NEWS_RULES}} input
 */
export function newsGuard({ events, fetchedAt, now = new Date(), rules = DEFAULT_NEWS_RULES }) {
  const fetched = fetchedAt ? new Date(fetchedAt).getTime() : NaN;
  if (!Array.isArray(events) || !Number.isFinite(fetched))
    return { state: 'UNKNOWN', pauseNewEntries: true, reason: 'News data unavailable. Treat new entries as paused.' };
  if (now.getTime() - fetched > rules.maxFeedAgeMinutes * 60000)
    return { state: 'UNKNOWN', pauseNewEntries: true, reason: 'News data is stale. Treat new entries as paused until the calendar refreshes.' };
  const active = events
    .filter(event => event.currency === 'USD' && event.impact === 'HIGH')
    .map(event => ({ event, at: new Date(event.time).getTime() }))
    .find(({ at }) => now.getTime() >= at - rules.pauseBeforeMinutes * 60000 && now.getTime() < at + rules.resumeAfterMinutes * 60000);
  if (active)
    return { state: 'PAUSE_NEW_ENTRIES', pauseNewEntries: true, event: active.event.title, until: new Date(active.at + rules.resumeAfterMinutes * 60000).toISOString(), reason: 'High-impact USD release inside the restriction window. Existing SL/TP stay active; positions are not closed.' };
  return { state: 'NO_ACTIVE_RESTRICTION', pauseNewEntries: false, reason: 'No high-impact USD release inside the configured window. This is not a safety guarantee.' };
}
