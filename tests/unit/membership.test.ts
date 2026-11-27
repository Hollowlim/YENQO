import { expect, it } from 'vitest';
import { hasFullMemberAccess, canViewMemberRoute, memberDestination, trialDaysLeft, memberLabel } from '../../apps/web/server/membership-policy.js';
import {renderPage} from '../../apps/web/server/render.js';

const day = 86400000;
const oldMember = { role: 'MEMBER', name: 'Example member', email: 'member@example.test', createdAt: new Date(Date.now() - 400 * day), membership: null };
it('grants full access only to admins and members inside their free trial; IB records no longer count', () => {
  expect(hasFullMemberAccess(oldMember)).toBe(false);
  const formerIb = { ...oldMember, membership: { status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: 'reviewer', verifiedAt: new Date() } };
  expect(hasFullMemberAccess(formerIb)).toBe(false);
  expect(memberLabel(formerIb)).toBe('Free member');
  expect(hasFullMemberAccess({ role: 'ADMIN' })).toBe(true);
  expect(hasFullMemberAccess(null)).toBe(false);
});
it('gives every new member 90 days of full access', () => {
  const now = Date.now();
  const fresh = { ...oldMember, createdAt: new Date(now - day) };
  expect(trialDaysLeft(fresh, now)).toBe(89);
  expect(hasFullMemberAccess(fresh)).toBe(true);
  expect(memberLabel(fresh)).toMatch(/^Free trial · 8[89] days left$/);
  expect(trialDaysLeft({ ...fresh, createdAt: new Date(now - 91 * day) }, now)).toBe(0);
  expect(trialDaysLeft({ ...fresh, role: 'ADMIN' }, now)).toBe(0);
  expect(trialDaysLeft({ ...fresh, createdAt: undefined }, now)).toBe(0);
});
it('shows access and the three plans on Membership with no IB or deposit wording', async () => {
  const trial = (await renderPage('/app/membership', { ...oldMember, createdAt: new Date(Date.now() - day) }))!;
  expect(trial).toMatch(/data-membership-status>Free trial</);
  expect(trial).toMatch(/8[89] days left/);
  for (const price of ['USD 10', 'USD 100', 'USD 400']) expect(trial).toContain(price);
  expect(trial).not.toMatch(/\bIB\b|qualifying deposit|JUSTMARKET/);
  const ended = (await renderPage('/app/membership', oldMember, new URLSearchParams('notice=access-required')))!;
  expect(ended).toMatch(/data-membership-status>Free</);
  expect(ended).toContain('That page needs a plan or an active free trial.');
  const admin = (await renderPage('/app/membership', { role: 'ADMIN', name: 'Admin', email: 'admin@example.test' }))!;
  expect(admin).toMatch(/data-membership-status>Administrator</);
});
it('permits free account security/onboarding while deferred modules stay unavailable', () => {
  for (const route of ['/app/membership','/app/settings','/app/mt5']) expect(canViewMemberRoute(oldMember, route)).toBe(true);
  for (const route of ['/app','/app/mapping','/app/community','/app/signals','/app/academy','/app/journal','/app/mt5/devices','/app/mt5/commands/example','/app/backtesting','/app/notifications']) expect(canViewMemberRoute(oldMember, route)).toBe(false);
  expect(memberDestination(oldMember)).toBe('/app/mt5');
  expect(memberDestination({ role: 'ADMIN' })).toBe('/admin');
});
it('does not make a member an admin or confer customer trade authority', () => {
  expect(canViewMemberRoute({ ...oldMember, createdAt: new Date() }, '/admin')).toBe(false);
  expect(canViewMemberRoute({ role: 'ADMIN' }, '/app')).toBe(true);
});
