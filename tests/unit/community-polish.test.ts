import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
it('provides icons, a copyright footer and a photo attachment composer without the chart-link input', async () => {
  for (const [file, path] of [['member', '/app/signals'], ['admin', '/admin/signals']]) {
    const html = await readFile(`apps/web/templates/${file}-navigation.html`, 'utf8');
    expect(html.match(new RegExp(`<a[^>]+href="${path}"[\\s\\S]*?</a>`))?.[0]).toContain('<svg');
  }
  const chat = await readFile('apps/web/pages/member/community.html', 'utf8');
  expect(chat).toContain('data-community-attach'); expect(chat).not.toContain('name="chartUrl"');
  expect(await readFile('apps/web/templates/layout.html', 'utf8')).toContain('All rights reserved');
});
