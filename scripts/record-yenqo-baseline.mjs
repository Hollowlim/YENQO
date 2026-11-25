// Records the approved YENQO rebrand bytes for the earlier byte-freeze tests.
// Only keys whose current hash differs from the layered expectation are written,
// so every other frozen file and render stays protected. Re-run only after an approved change.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { renderPage } from '../apps/web/server/render.js';

const sha = value => createHash('sha256').update(value).digest('hex');
const json = async file => JSON.parse(await readFile(`docs/${file}`, 'utf8'));
const changed = {};
const note = (key, actual, expected) => { if (actual !== expected) changed[key] = actual; };

// tests/unit/homepage-v7.test.ts
const v7member = { id: 'v7-preservation', name: 'Example member', email: 'example@example.test', role: 'MEMBER', membership: { status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: 'example-admin', verifiedAt: new Date(0) } };
const layers = await Promise.all(['TRADING_TOOLS_APPROVED_CHANGES', 'SESSION_NAVIGATION_BASELINE', 'MEMBERSHIP_APPROVED_BASELINE', 'AVATAR_SIDEBAR_BASELINE', 'METAAPI_SWITCH_BASELINE', 'RESEND_REVIEW_BASELINE', 'JOURNAL_NAV_REMOVAL_BASELINE', 'ACCOUNT_SETTINGS_REFRESH_BASELINE'].map(name => json(`${name}.json`)));
for (const [key, hash] of Object.entries(await json('V7_PORTAL_PRESERVATION.json'))) {
  const path = key.slice(7);
  const data = key.startsWith('render:') ? await renderPage(path, { ...v7member, role: path.startsWith('/admin') ? 'ADMIN' : 'MEMBER' }) : await readFile(key);
  note(key, sha(data), layers.map(layer => layer[key]).find(Boolean) ?? hash);
}
// tests/unit/clean-portals.test.ts and tests/unit/v6-portals.test.ts
const [realEntry, v7, launch, membership, product, logo] = await Promise.all(['REAL_INDEX_ENTRY_BASELINE', 'V7_HOMEPAGE_BASELINE', 'LAUNCH_SCOPE_BASELINE', 'MEMBERSHIP_APPROVED_BASELINE', 'PRODUCT_HOMEPAGE_BASELINE', 'LOGO_REFRESH_BASELINE'].map(name => json(`${name}.json`)));
for (const [key, hash] of Object.entries(await json('CLEAN_PORTAL_HOMEPAGE_BASELINE.json')))
  note(key, sha(key === 'rendered-public-homepage' ? await renderPage('/', null) : await readFile(key)), realEntry[key] ?? v7[key] ?? launch[key] ?? hash);
for (const [key, hash] of Object.entries(await json('V6_HOMEPAGE_BASELINE.json')))
  note(key, sha(await readFile(key)), (key === 'apps/web/public/membership.js' ? membership[key] : undefined) ?? realEntry[key] ?? v7[key] ?? launch[key] ?? product[key] ?? logo[key] ?? hash);
// tests/unit/trading-tools-preservation.test.ts
const tools = await json('TRADING_TOOLS_BASELINE.json');
const allowed = ['apps/web/server/index.js', 'apps/web/server/render.js', 'apps/web/server/membership-policy.js', 'apps/web/templates/portal-member-navigation.html'];
for (const [file, hash] of Object.entries(tools.files)) if (!allowed.includes(file)) note(file, sha(await readFile(file)), hash);
for (const [path, hash] of Object.entries(tools.renders)) {
  const user = path === '/' ? null : { id: 'tools-preservation', role: 'ADMIN', name: 'Example member', email: 'example@example.test' };
  note(`tools-render:${path}`, sha((await renderPage(path, user)) ?? 'unavailable'), hash);
}
await writeFile('docs/YENQO_REBRAND_BASELINE.json', JSON.stringify(Object.fromEntries(Object.entries(changed).sort()), null, 1) + '\n');
console.log(`Recorded ${Object.keys(changed).length} approved YENQO changes.`);
