import { SESSION_COOKIE, SESSION_SECONDS } from "./auth.js";
export function jsonResponse(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function setSessionCookie(response, token, maxAge = SESSION_SECONDS) {
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}
export function securityHeaders(withMarketChart = false) {
  return {
    "Content-Security-Policy":
      `default-src 'self'; script-src 'self'${withMarketChart ? " https://s3.tradingview.com" : ""}; frame-src ${withMarketChart ? "https://www.tradingview.com https://s.tradingview.com" : "'none'"}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}
