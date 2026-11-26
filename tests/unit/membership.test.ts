import { expect, it } from 'vitest';
import { hasFullMemberAccess, canViewMemberRoute, memberDestination, parseUsdToCents, IB_POLICY, trialDaysLeft, memberLabel } from '../../apps/web/server/membership-policy.js';
import {renderPage} from '../../apps/web/server/render.js';

const membership = { status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: 'reviewer', verifiedAt: new Date() };
it('hides both plan cards and reapplication before JavaScript only for actual approved access',async()=>{
 const member={role:'MEMBER',name:'Example member',email:'member@example.test',membership};
 const approved=(await renderPage('/app/membership',member))!;
 expect(approved).toMatch(/<div class="membership-plans"[^>]* hidden>/);expect(approved).toMatch(/<section id="membership-request"[^>]* hidden>/);expect(approved).toContain('data-membership-status>APPROVED');
 for(const status of ['FREE','PENDING','REVOKED']){
  const html=(await renderPage('/app/membership',{...member,membership:{...membership,status}}))!;expect(html).not.toMatch(/<div class="membership-plans"[^>]* hidden>/);expect(html).not.toMatch(/<section id="membership-request"[^>]* hidden>/);
 }
 const incomplete=(await renderPage('/app/membership',{...member,membership:{...membership,verifiedAt:null}}))!;expect(incomplete).toContain('data-membership-status>REVIEW REQUIRED');expect(incomplete).not.toMatch(/<div class="membership-plans"[^>]* hidden>/);
 const admin=(await renderPage('/app/membership',{role:'ADMIN',name:'Admin',email:'admin@example.test'}))!;expect(admin).toContain('data-membership-status>ADMINISTRATOR');expect(admin).toMatch(/<section id="membership-request"[^>]* hidden>/);
});
it('requires reviewed IB linkage and at least USD100, never self-reported deposit or plan names', () => {
  const user = { role: 'MEMBER', membership };
  expect(hasFullMemberAccess(user)).toBe(true);
  for (const change of [
    { status: 'PENDING' }, { status: 'REVOKED' }, { verifiedDepositCents: 0 }, { verifiedDepositCents: 9999 },
    { verifiedIbCode: 'other' }, { verifiedBroker: 'OTHER' }, { verifiedById: null }, { verifiedAt: null },
  ]) expect(hasFullMemberAccess({ ...user, membership: { ...membership, ...change } })).toBe(false);
  expect(hasFullMemberAccess({ role: 'MEMBER', membership: { plan: 'IB_MEMBER', entitlements: ['all'], claimedDepositCents: 100000 } })).toBe(false);
  expect(hasFullMemberAccess({ role: 'MEMBER', membership: { ...membership, verifiedDepositCents: 10001 } })).toBe(true);
  expect(hasFullMemberAccess(null)).toBe(false);
  expect(IB_POLICY.ibCode).toBe('jai4w0w6');
});
it('permits free account security/onboarding while deferred modules stay unavailable', () => {
  const free = { role: 'MEMBER', membership: null };
  for (const route of ['/app/membership','/app/settings','/app/mt5']) expect(canViewMemberRoute(free, route)).toBe(true);
  for (const route of ['/app','/app/mapping','/app/community','/app/signals','/app/academy','/app/journal','/app/mt5/devices','/app/mt5/commands/example','/app/backtesting','/app/notifications']) expect(canViewMemberRoute(free, route)).toBe(false);
  expect(memberDestination(free)).toBe('/app/mt5');
  expect(memberDestination({ role: 'MEMBER', membership })).toBe('/app/mt5');
  expect(memberDestination({ role: 'ADMIN' })).toBe('/admin');
});
it('does not make a qualifying member an admin or confer customer trade authority', () => {
  expect(canViewMemberRoute({ role: 'MEMBER', membership }, '/admin')).toBe(false);
  expect(canViewMemberRoute({ role: 'ADMIN' }, '/app')).toBe(true);
});
it('parses USD without floating point rounding or accepting invalid/negative amounts', () => {
  expect(parseUsdToCents('99.99')).toBe(9999);
  expect(parseUsdToCents('100')).toBe(10000);
  expect(parseUsdToCents('100.01')).toBe(10001);
  for (const value of ['-100','1e2','100.001','NaN','Infinity','',100,null]) expect(parseUsdToCents(value)).toBeNull();
});
it('gives every new member 90 days of full access without IB verification', async () => {
  const day = 86400000, now = Date.now();
  const fresh = { role: 'MEMBER', name: 'Trial member', email: 'trial@example.test', createdAt: new Date(now - day), membership: { status: 'FREE' } };
  expect(trialDaysLeft(fresh, now)).toBe(89);
  expect(hasFullMemberAccess(fresh)).toBe(true);
  expect(memberLabel(fresh)).toMatch(/^Free trial · 8[89] days left$/);
  const expired = { ...fresh, createdAt: new Date(now - 91 * day) };
  expect(trialDaysLeft(expired, now)).toBe(0);
  expect(hasFullMemberAccess(expired)).toBe(false);
  expect(memberLabel(expired)).toBe('Free member');
  expect(trialDaysLeft({ ...fresh, role: 'ADMIN' }, now)).toBe(0);
  expect(trialDaysLeft({ ...fresh, createdAt: undefined }, now)).toBe(0);
  const page = (await renderPage('/app/membership', fresh))!;
  expect(page).toContain('data-membership-status>FREE TRIAL');
  expect(page).toMatch(/Free trial: 8[89] days left/);
});
