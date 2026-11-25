import { jsonResponse, setSessionCookie } from "./http.js";
import { Prisma } from "@prisma/client";
import { db } from "./db.js";
import {
  credentialsSchema,
  adminCredentialsSchema,
  registrationSchema,
  emailSchema,
  resetSchema,
  hashPassword,
  verifyPassword,
  newToken,
  digestToken,
  isSameOrigin,
} from "./security.js";
import { SESSION_COOKIE, SESSION_SECONDS } from "./auth.js";
import { takeRateLimit } from "./rate-limit.js";
import { resetDeliveryEnabled } from "./email.js";
import { queueResetRequest } from './reset-jobs.js';
import { readBoundedJson } from "./request-body.js";
import { memberDestination } from "./membership-policy.js";
const json = (message, status = 200) => jsonResponse({ message }, status);
const dummyHash = "scrypt-v1:" + "0".repeat(32) + ":" + "0".repeat(128);
export async function POST(request, context) {
  const origin = process.env.APP_ORIGIN;
  if (!origin || !isSameOrigin(request.headers.get("origin"), origin))
    return json("Request origin rejected.", 403);
  const { action } = await context.params;
  if (
    ![
      "login",
      "register",
      "logout",
      "forgot-password",
      "reset-password",
    ].includes(action)
  )
    return json("Not found.", 404);
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return json("Request too large.", 413);
  try {
    if (
      action !== "logout" &&
      !(await takeRateLimit(`auth-public:${action}`, "all", 120, 60))
    )
      return json("Too many requests. Try again later.", 429);
    let body;
    try {
      body = await readBoundedJson(request.body, 8192);
    } catch (error) {
      return error instanceof Error && error.message === "BODY_TOO_LARGE"
        ? json("Request too large.", 413)
        : json("Invalid request.", 400);
    }
    if (action === "logout") {
      const token = request.headers
        .get("cookie")
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(`${SESSION_COOKIE}=`))
        ?.slice(SESSION_COOKIE.length + 1);
      if (token) {
        const session = await db.session.findUnique({
          where: { tokenHash: digestToken(token) },
        });
        if (
          session &&
          !(await takeRateLimit("logout-user", session.userId, 30, 60))
        )
          return json("Too many sign-out requests. Try again shortly.", 429);
        if (session)
          await db.$transaction(async (tx) => {
            await tx.session.deleteMany({
              where: { id: session.id, userId: session.userId },
            });
            await tx.auditEvent.create({
              data: { actorId: session.userId, action: "AUTH_LOGOUT" },
            });
          });
      }
      const response = json("Signed out.");
      setSessionCookie(response, "", 0);
      return response;
    }
    if (action === "register") {
      const parsed = registrationSchema.safeParse(body);
      if (!parsed.success)
        return json(
          "Enter a name, valid email and a password of 12–256 characters. Provide broker and numeric MT5 account together, or leave both blank.",
          400,
        );
      if (!(await takeRateLimit("register-global", "all", 20, 3600)))
        return json("Too many registration attempts. Try again later.", 429);
      const { name, email, password, brokerName, mt5Account, mt5Server } = parsed.data;
      const passwordHash = await hashPassword(password);
      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            brokerName: brokerName || null,
            mt5Account: mt5Account || null,
            mt5Server: mt5Server || null,
            role: "MEMBER",
            membership: {
              create: { plan: "FREE", entitlements: [] },
            },
          },
        });
        await tx.auditEvent.create({
          data: { actorId: user.id, action: "AUTH_REGISTER" },
        });
      });
      return json("Account created. You can now sign in.", 201);
    }
    if (action === "login") {
      const usernameMode =
        typeof body === "object" && body !== null && "username" in body;
      const parsed = usernameMode
        ? adminCredentialsSchema.safeParse(body)
        : credentialsSchema.safeParse(body);
      if (!parsed.success)
        return json("Enter a valid email or admin username and password.", 400);
      const { password } = parsed.data;
      const identifier =
        "username" in parsed.data ? parsed.data.username : parsed.data.email;
      if (!(await takeRateLimit("login-email", identifier, 8, 900)))
        return json("Too many sign-in attempts. Try again in 15 minutes.", 429);
      const user = await db.user.findUnique({
        where:
          "username" in parsed.data
            ? { username: parsed.data.username }
            : { email: parsed.data.email },
        include: { membership: true },
      });
      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? dummyHash,
      );
      if (!user || !valid || (usernameMode && user.role !== "ADMIN")) {
        await db.auditEvent.create({
          data: { actorId: user?.id, action: "AUTH_LOGIN_REJECTED" },
        });
        return json("Email or password is incorrect.", 401);
      }
      const token = newToken();
      const created = await db.$transaction(async (tx) => {
        const unchanged = await tx.user.updateMany({
          where: { id: user.id, passwordHash: user.passwordHash },
          data: { lastLoginAt: new Date() },
        });
        if (!unchanged.count) return false;
        await tx.session.create({
          data: {
            tokenHash: digestToken(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
          },
        });
        await tx.auditEvent.create({
          data: { actorId: user.id, action: "AUTH_LOGIN" },
        });
        return true;
      });
      if (!created)
        return json("Credentials changed. Please sign in again.", 401);
      const response = jsonResponse({
        message: "Signed in.",
        redirect: memberDestination(user),
      });
      setSessionCookie(response, token);
      return response;
    }
    if (action === "forgot-password") {
      const parsed = emailSchema.safeParse(body);
      if (!parsed.success) return json("Enter a valid email.", 400);
      if (!(await takeRateLimit("reset-email", parsed.data.email, 3, 3600)))
        return json("Too many requests. Try again later.", 429);
      if (!resetDeliveryEnabled())
        return json(
          "Password reset delivery is not configured. Contact support.",
          503,
        );
      if (!queueResetRequest(parsed.data.email)) return json('Password reset is busy. Try again shortly.',503);
      return json(
        "If an account exists and email delivery is available, a reset link will arrive. If it does not arrive, contact support. Links expire after 30 minutes.",
      );
    }
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success)
      return json(
        "Invalid reset link or password. Use at least 12 characters.",
        400,
      );
    if (!(await takeRateLimit("reset-complete-global", "all", 20, 3600)))
      return json("Too many reset attempts. Try again later.", 429);
    const passwordHash = await hashPassword(parsed.data.password);
    const reset = await db.passwordReset.findUnique({
      where: { tokenHash: digestToken(parsed.data.token) },
    });
    if (!reset)
      return json("Reset link is invalid, expired or already used.", 400);
    const changed = await db.$transaction(async (tx) => {
      const claim = await tx.passwordReset.updateMany({
        where: {
          id: reset.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (!claim.count) return false;
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      });
      await tx.session.deleteMany({ where: { userId: reset.userId } });
      await tx.passwordReset.updateMany({
        where: { userId: reset.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: { actorId: reset.userId, action: "AUTH_PASSWORD_RESET" },
      });
      return true;
    });
    return changed
      ? json("Password updated. Sign in with your new password.")
      : json("Reset link is invalid, expired or already used.", 400);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return json(
        "Unable to create account. Try signing in or resetting your password.",
        409,
      );
    return json(
      "Service unavailable. Check the local database and configuration, then try again.",
      503,
    );
  }
}
