import { currentUser } from "./auth.js";
import { jsonResponse } from "./http.js";
import { takeRateLimit } from "./rate-limit.js";
import { hasFullMemberAccess, trialDaysLeft } from "./membership-policy.js";

const message = (text, status = 200) => jsonResponse({ message: text }, status);

// IB membership review was removed; members only read their own access state here.
export async function membershipApi(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/api/membership/me") return message("Not found.", 404);
  try {
    const user = await currentUser(request);
    if (!user) return message("Sign in required.", 401);
    if (!(await takeRateLimit("membership-user:GET", user.id, 120, 60))) return message("Too many requests. Try again shortly.", 429);
    return jsonResponse({ fullAccess: hasFullMemberAccess(user), trialDaysLeft: trialDaysLeft(user), isAdmin: user.role === "ADMIN" });
  } catch {
    return message("Membership status is temporarily unavailable.", 503);
  }
}
