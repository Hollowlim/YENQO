import {isLaunchPathEnabled} from './launch-policy.js';
export const IB_POLICY = Object.freeze({
  broker: "JUSTMARKET",
  ibCode: "jai4w0w6",
  minimumDepositCents: 10000,
});

export function parseUsdToCents(value) {
  if (typeof value !== "string" || !/^\d{1,7}(?:\.\d{1,2})?$/.test(value))
    return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 100000000 ? cents : null;
}
// Every new member gets full access for 90 days from sign-up; no IB link or deposit needed.
export const TRIAL_DAYS = 90;
export function trialDaysLeft(user, now = Date.now()) {
  const start = user?.role === "MEMBER" && user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  return Number.isFinite(start) ? Math.max(0, Math.ceil((start + TRIAL_DAYS * 86400000 - now) / 86400000)) : 0;
}
export function hasFullMemberAccess(user) {
  if (!user) return false;
  if (user.role === "ADMIN" || trialDaysLeft(user) > 0) return true;
  return isVerifiedIbMember(user);
}
export const memberLabel = (user) =>
  user?.role === "ADMIN" ? "Administrator" : isVerifiedIbMember(user) ? "Verified IB member" : trialDaysLeft(user) > 0 ? `Free trial · ${trialDaysLeft(user)} days left` : "Free member";
export function isVerifiedIbMember(user) {
  const m = user?.membership;
  return Boolean(
    m &&
    m.status === "APPROVED" &&
    m.verifiedBroker === IB_POLICY.broker &&
    m.verifiedIbCode === IB_POLICY.ibCode &&
    Number.isInteger(m.verifiedDepositCents) &&
    m.verifiedDepositCents >= IB_POLICY.minimumDepositCents &&
    m.verifiedById &&
    m.verifiedAt,
  );
}
export function canViewMemberRoute(user, pathname) {
  pathname = pathname.split(/[?#]/, 1)[0];
  if (!user || !pathname.startsWith("/app") || !isLaunchPathEnabled(pathname)) return false;
  if (
    ["/app/membership", "/app/settings", "/app/mt5", "/app/rooms", "/app/news", "/app/mapping", "/app/community", "/app/signals"].includes(pathname)
  )
    return true;
  return hasFullMemberAccess(user);
}
// Every client lands on Tools; membership status lives in the account menu.
export const memberDestination = (user) =>
  user?.role === "ADMIN" ? "/admin" : "/app/mt5";
