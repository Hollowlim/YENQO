import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
it('starts the Trade Manager without fabricated connected account values', async () => {
  const html = await readFile('apps/web/pages/member/mt5.html', 'utf8');
  const content = html.split('<!-- PAGE CONTENT START -->')[1]?.split('<!-- PAGE CONTENT END -->')[0] ?? '';
  expect(content).not.toContain('data-v2-trade');
  expect(content).toContain('Profit &amp; Loss');
  expect(content).toContain('Risk &amp; Lot Size');
  expect(content).toContain('Risk / Reward');
  expect(content).toContain('Secure read-only pairing is not available in this release.');
  expect(content).not.toContain('name="investorPassword"');
  expect(content).not.toContain('$5,000');
  expect(content).not.toContain('DEMO-B1'); // The HTML contains no hardcoded broker position rows.
});
