import { expect, it, vi } from 'vitest';
import { newsGuard, isMajorUsdEvent } from '../../apps/web/server/news-guard.js';
import { createNewsApi } from '../../apps/web/server/news-routes.js';
import { createEaApi } from '../../apps/web/server/ea-routes.js';
import { renderPage } from '../../apps/web/server/render.js';
import { canViewMemberRoute, memberDestination } from '../../apps/web/server/membership-policy.js';

const now = new Date('2026-12-04T13:00:00Z');
const event = (minutes: number, extra = {}) => ({ id: String(minutes), title: 'Non-Farm Employment Change', currency: 'USD', impact: 'HIGH', time: new Date(now.getTime() + minutes * 60000).toISOString(), forecast: '150K', previous: '120K', actual: null, ...extra });
const member = { id: 'member-a', role: 'MEMBER' as const, email: 'a@example.test', name: 'Member A', profilePhoto: null, membership: null, mentorApprovedAt: null, createdAt: new Date(0) };
const get = (path: string) => new Request('http://127.0.0.1:3000' + path);

it('never reports a clear news state when calendar data is missing or stale', () => {
  expect(newsGuard({ events: null, fetchedAt: null, now })).toMatchObject({ state: 'UNKNOWN', pauseNewEntries: true });
  expect(newsGuard({ events: [], fetchedAt: new Date(now.getTime() - 61 * 60000), now })).toMatchObject({ state: 'UNKNOWN', pauseNewEntries: true });
  const paused = newsGuard({ events: [event(20)], fetchedAt: now, now });
  expect(paused).toMatchObject({ state: 'PAUSE_NEW_ENTRIES', pauseNewEntries: true, event: 'Non-Farm Employment Change' });
  expect(paused.reason).toMatch(/SL\/TP stay active; positions are not closed/);
  expect(newsGuard({ events: [event(-29)], fetchedAt: now, now }).state).toBe('PAUSE_NEW_ENTRIES');
  const clear = newsGuard({ events: [event(-31), event(31), event(5, { impact: 'MEDIUM' }), event(5, { currency: 'EUR' })], fetchedAt: now, now });
  expect(clear).toMatchObject({ state: 'NO_ACTIVE_RESTRICTION', pauseNewEntries: false });
  for (const result of [paused, clear]) expect(JSON.stringify(result)).not.toMatch(/safe to trade/i);
  expect(isMajorUsdEvent({ title: 'Core CPI m/m', currency: 'USD' })).toBe(true);
  expect(isMajorUsdEvent({ title: 'FOMC Statement', currency: 'USD' })).toBe(true);
  expect(isMajorUsdEvent({ title: 'CPI y/y', currency: 'EUR' })).toBe(false);
});

it('shows an unavailable state without a provider and filters a configured provider to USD high/medium', async () => {
  const deps = { principal: async () => member, rateLimit: async () => true, now: () => now };
  expect((await createNewsApi({ ...deps, principal: async () => null })(get('/api/news/usd'))).status).toBe(401);
  const none = await (await createNewsApi({ ...deps, providerName: '' })(get('/api/news/usd'))).json();
  expect(none).toMatchObject({ status: 'unavailable', events: [], fetchedAt: null, guard: { state: 'UNKNOWN' }, reference: 'https://www.forexfactory.com/calendar' });
  expect((await (await createNewsApi({ ...deps, providerName: 'unknown' })(get('/api/news/usd'))).json()).status).toBe('misconfigured');
  const provider = vi.fn(async () => [event(90), event(120, { id: 'eur', currency: 'EUR' }), event(150, { id: 'low', impact: 'LOW' }), event(180, { id: 'cpi', title: 'Retail Sales m/m', impact: 'MEDIUM' })]);
  const body = await (await createNewsApi({ ...deps, providerName: 'fixture', provider })(get('/api/news/usd'))).json();
  expect(body.status).toBe('ok');
  expect(body.events.map((e: { id: string }) => e.id)).toEqual(['90', 'cpi']);
  expect(body.events[0].major).toBe(true);
  expect(body.guard.state).toBe('NO_ACTIVE_RESTRICTION');
  const broken = await (await createNewsApi({ ...deps, providerName: 'fixture', provider: async () => [{ title: 'missing fields' }] })(get('/api/news/usd'))).json();
  expect(broken).toMatchObject({ status: 'error', events: [], guard: { state: 'UNKNOWN' } });
});

it('validates, audits and always rejects EA commands without reaching a broker', async () => {
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  const audits: unknown[] = [];
  const database = { auditEvent: { create: vi.fn(async (args: unknown) => { audits.push(args); }) } };
  const api = createEaApi({ principal: async () => member, rateLimit: async () => true, database } as never);
  const post = (body: unknown, origin = 'http://127.0.0.1:3000') => api(new Request('http://127.0.0.1:3000/api/ea/commands', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const clientKey = '0f8fad5b-d9cb-469f-a165-70867728950e';
  expect((await post({ action: 'START', clientKey }, 'https://evil.example')).status).toBe(403);
  expect((await createEaApi({ principal: async () => null } as never)(new Request('http://127.0.0.1:3000/api/ea/status'))).status).toBe(401);
  for (const bad of [{ action: 'BUY', clientKey }, { action: 'START', clientKey, accountId: 'other' }, { action: 'START', clientKey, userId: 'member-b' }, { action: 'UPDATE_SETTINGS', clientKey }, { action: 'UPDATE_SETTINGS', clientKey, settings: { lotSize: 5, riskPercent: 50, maxExposureLots: 1, maxLayers: 3, stopLossPoints: null, takeProfitPoints: null, breakevenTriggerPoints: null, partialClosePercent: 50 } }])
    expect((await post(bad)).status, JSON.stringify(bad)).toBe(400);
  expect(audits).toHaveLength(0);
  const response = await post({ action: 'EMERGENCY_STOP', clientKey });
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ accepted: false, status: 'REJECTED', reason: 'EXECUTION_DISABLED', brokerConfirmed: false });
  expect(audits).toEqual([{ data: { actorId: 'member-a', action: 'EA_COMMAND_REJECTED', targetId: 'member-a', details: { action: 'EMERGENCY_STOP', clientKey, reason: 'EXECUTION_DISABLED' } } }]);
  const status = await (await api(new Request('http://127.0.0.1:3000/api/ea/status'))).json();
  expect(status).toMatchObject({ connector: 'PENDING', execution: 'DISABLED', account: null, positions: [] });
  vi.unstubAllEnvs();
});

it('renders the YENQO terminal, rooms, news and admin platform honestly and lands clients on Tools', async () => {
  expect(memberDestination(member)).toBe('/app/mt5');
  for (const path of ['/app/rooms', '/app/news', '/app/mt5']) expect(canViewMemberRoute(member, path)).toBe(true);
  const tools = (await renderPage('/app/mt5', member))!;
  for (const text of ['data-yq-terminal', 'Chart: demo data, not market prices', 'Execution disabled', '/assets/terminal.js', 'data-trading-tools', 'Request settings update', 'Emergency stop']) expect(tools).toContain(text);
  expect(tools.match(/<h1\b/g)).toHaveLength(1);
  expect(tools).not.toMatch(/data-trade-action|name="investorPassword"|YENGFX|YENGHUB/);
  const rooms = (await renderPage('/app/rooms', member))!;
  expect(rooms).toContain('/assets/rooms.js'); expect(rooms).toContain('never shares your MT5 account');
  const news = (await renderPage('/app/news', member))!;
  expect(news).toContain('href="https://www.forexfactory.com/calendar"'); expect(news).not.toMatch(/safe to trade/i);
  const platform = (await renderPage('/admin/platform', { ...member, role: 'ADMIN' }))!;
  expect(platform).toContain('EA execution'); expect(platform).toContain('Disabled'); expect(platform).not.toContain('{{PLATFORM_STATUS}}');
  for (const path of ['/', '/auth/login', '/auth/register', '/app/settings', '/admin']) {
    const html = (await renderPage(path, path.startsWith('/admin') ? { ...member, role: 'ADMIN' } : path.startsWith('/app') ? member : null))!;
    expect(html, path).toContain('YENQO');
    expect(html, path).toContain('href="/assets/yenqo.css"');
    expect(html.replace(/YENGFX read-only/g, ''), path).not.toMatch(/YENGFX|YENGHUB/);
  }
});
