import { db } from "./db.js";
import { digestToken, sessionIsValid } from "./security.js";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-yengfx_session"
    : "yengfx_session";
export const SESSION_SECONDS = 86400;
export function requestToken(request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export async function currentUser(request) {
  const token = requestToken(request);
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digestToken(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          membership: true,
          mentorApprovedAt: true,
          profilePhoto: { select: { imageHash: true } },
        },
      },
    },
  });
  return session && sessionIsValid(session) ? session.user : null;
}
