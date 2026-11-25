import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
it('replaces the old account overview with an honest empty performance dashboard', async () => {
  const html = await readFile('apps/web/pages/member/overview.html', 'utf8');
  const content = html.split('<!-- PAGE CONTENT START -->')[1]?.split('<!-- PAGE CONTENT END -->')[0];
  expect(content).not.toContain('data-dashboard'); expect(content).toContain('/app/calendar');
  expect(content).not.toContain('$5,000');
  expect(content).not.toContain('data-tradingview-chart');
  expect(content).toContain('/app/academy'); expect(content).not.toContain('/app/mapping');
  const calendar = await readFile('apps/web/pages/member/calendar.html','utf8');
  expect(calendar).toContain('No broker history synced');
  expect(calendar).toContain('data-dashboard');
  expect(calendar).toContain('P/L Calendar');
  const chat = await readFile('apps/web/pages/member/community.html', 'utf8');
  expect(chat).not.toContain('All registered members can read. Verified IB + USD 100 members can post and reply.');
});
