import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const browser = await chromium.launch();
try {
  for (const width of [1440, 834, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; const privateRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/\/api\//.test(request.url())) privateRequests.push(request.url()); });
    await page.goto(pathToFileURL(resolve('apps/web/pages/index.html')).href);
    const menu = page.getByRole('navigation', { name: 'Preview view', exact: true });
    await menu.getByRole('link', { name: 'Client View', exact: true }).click();
    if (!page.url().endsWith('/member/overview.html')) throw new Error('Client navigation failed');
    await menu.getByRole('link', { name: 'Admin View', exact: true }).click();
    if (!page.url().endsWith('/admin/overview.html')) throw new Error('Admin navigation failed');
    await menu.getByRole('link', { name: 'Homepage', exact: true }).click();
    if (!page.url().endsWith('/index.html')) throw new Error('Home navigation failed');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
    if (errors.length || privateRequests.length) throw new Error('Preview errors or private API requests');
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)) {
      console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0,8).map(e => ({ tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right,parent:e.parentElement?.outerHTML.slice(0,250) }))));
      throw new Error('Preview overflow');
    }
    console.log(`Offline HTML portal navigation passed at ${width}px; no private API requests.`);
    await page.close();
  }
} finally { await browser.close(); }
