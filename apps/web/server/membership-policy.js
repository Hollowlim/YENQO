import {isLaunchPathEnabled} from './launch-policy.js';
// Every new member gets full access for 90 days from sign-up.
// MEMBER_TRIAL_DAYS=0 turns the trial off; start the local server with it before running integration tests.
export const TRIAL_DAYS = /^\d{1,4}$/.test(process.env.MEMBER_TRIAL_DAYS ?? "") ? Number(process.env.MEMBER_TRIAL_DAYS) : 90;
export function trialDaysLeft(user, now = Date.now()) {
  const start = user?.role === "MEMBER" && user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  return Number.isFinite(start) ? Math.max(0, Math.ceil((start + TRIAL_DAYS * 86400000 - now) / 86400000)) : 0;
}
// Paid plans. Prices are shown on Membership; only the payment webhook (or tests) set a plan.
export const PLANS = Object.freeze({ MONTHLY: "Monthly plan", YEARLY: "Yearly plan", LIFETIME: "Lifetime plan" });
export function hasActivePlan(user, now = Date.now()) {
  const m = user?.membership;
  if (!m || !Object.hasOwn(PLANS, m.plan)) return false;
  return m.plan === "LIFETIME" || (m.accessUntil != null && new Date(m.accessUntil).getTime() > now);
}
// Full access: administrators, members inside their free trial, and members with an active plan.
export function hasFullMemberAccess(user) {
  if (!user) return false;
  return user.role === "ADMIN" || trialDaysLeft(user) > 0 || hasActivePlan(user);
}
const day = (value) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium" }).format(new Date(value));
export const memberLabel = (user) =>
  user?.role === "ADMIN" ? "Administrator"
    : hasActivePlan(user) ? (user.membership.plan === "LIFETIME" ? PLANS.LIFETIME : `${PLANS[user.membership.plan]} · until ${day(user.membership.accessUntil)}`)
    : trialDaysLeft(user) > 0 ? `Free trial · ${trialDaysLeft(user)} days left` : "Free member";
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
