import { z } from "zod";
import { db } from "./db.js";
import { currentUser } from "./auth.js";
import { canAccessAdmin, isSameOrigin } from "./security.js";
import { jsonResponse } from "./http.js";
import { takeRateLimit } from "./rate-limit.js";
import { readBoundedJson } from "./request-body.js";
import { membershipEmailQueue } from './membership-email-jobs.js';
import {
  IB_POLICY,
  parseUsdToCents,
  hasFullMemberAccess,
} from "./membership-policy.js";

const claimSchema = z.object({
  version: z.number().int().min(0),
  brokerName: z.string().trim().max(60),
  ibCode: z.string().trim().max(80),
  accountSuffix: z
    .string()
    .regex(/^\d{4}$/, "Use only the last four account digits.").optional(),
  mt5Account: z.string().trim().regex(/^\d{4,20}$/).optional(),
  depositAmount: z.string().max(20),
  depositReference: z.string().trim().min(8).max(300).optional(),
}).refine(data => Boolean(data.mt5Account || data.accountSuffix));
const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "revoke"]),
  version: z.number().int().min(0),
  reason: z.string().trim().max(500).optional(),
  verifiedBroker: z.string().max(60).optional(),
  verifiedIbCode: z.string().max(80).optional(),
  verifiedDepositAmount: z.string().max(20).optional(),
  confirmed: z.boolean().optional(),
  verifiedAccountSuffix: z.string().regex(/^\d{4}$/).optional(),
  profileVersion: z.number().int().min(0).optional(),
  reasonCode: z.enum(['MC', 'IB_CHANGED', 'OTHER']).default('OTHER'),
}).refine(data => data.action === 'approve' || (data.reason?.length ?? 0) >= 10, { message: 'A review reason of at least 10 characters is required for revocation or rejection.' });
const ownSelect = {
  id: true,
  status: true,
  version: true,
  brokerName: true,
  ibCode: true,
  accountSuffix: true,
  claimedDepositCents: true,
  verifiedDepositCents: true,
  requestedAt: true,
  verifiedAt: true,
  reviewReason: true,
};
const message = (text, status = 200) => jsonResponse({ message: text }, status);

export async function membershipApi(request) {
  const url = new URL(request.url);
  const adminRoute = url.pathname.startsWith("/api/admin/");
  if (
    request.method === "POST" &&
    !isSameOrigin(request.headers.get("origin"), process.env.APP_ORIGIN)
  )
    return message("Request origin rejected.", 403);
  try {
    const user = await currentUser(request);
    if (!user) return message("Sign in required.", 401);
    if (adminRoute && !canAccessAdmin(user))
      return message("Administrator access required.", 403);
    if (
      !(await takeRateLimit(
        `${adminRoute ? "membership-admin" : "membership-user"}:${request.method}`,
        user.id,
        request.method === "GET" ? 120 : 20,
        60,
      ))
    )
      return message("Too many requests. Try again shortly.", 429);

    if (request.method === "GET" && url.pathname === "/api/membership/me") {
      const membership = await db.membership.findUnique({
        where: { userId: user.id },
        select: ownSelect,
      });
      return jsonResponse({
        membership: membership ?? { id: null, status: "FREE", version: 0 },
        fullAccess: hasFullMemberAccess(user),
        isAdmin: user.role === "ADMIN",
        policy: IB_POLICY,
      });
    }
    if (request.method === "GET" && url.pathname === "/api/admin/memberships") {
      const cursor = url.searchParams.get("after");
      if (cursor && cursor.length > 100) return message("Invalid cursor.", 400);
      const rows = await db.membership.findMany({
        where: { user: { role: 'MEMBER' } },
        orderBy: { id: "desc" },
        take: 51,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          ...ownSelect,
          depositReference: true,
          user: { select: { name: true, email: true, brokerName: true, mt5Account: true, mt5Server: true, profileVersion: true } },
        },
      });
      return jsonResponse({
        memberships: rows.slice(0, 50),
        next: rows.length > 50 ? rows[49].id : null,
        policy: IB_POLICY,
      });
    }
    if (request.method !== "POST") return message("Not found.", 404);
    let body;
    try {
      body = await readBoundedJson(request.body, 8192);
    } catch (error) {
      return message(
        error instanceof Error && error.message === "BODY_TOO_LARGE"
          ? "Request too large."
          : "Invalid request.",
        error instanceof Error && error.message === "BODY_TOO_LARGE"
          ? 413
          : 400,
      );
    }

    if (url.pathname === "/api/membership/request") {
      if (user.role === "ADMIN")
        return message(
          "Administrators do not request member verification.",
          403,
        );
      const parsed = claimSchema.safeParse(body);
      if (!parsed.success)
        return message(
          "Provide a valid MT5 account number and qualifying deposit amount.",
          400,
        );
      const data = parsed.data;
      const cents = parseUsdToCents(data.depositAmount);
      if (
        data.brokerName !== IB_POLICY.broker ||
        data.ibCode !== IB_POLICY.ibCode ||
        cents === null ||
        cents < IB_POLICY.minimumDepositCents
      )
        return message(
          "Verification requires the configured JUSTMARKET IB code and a qualifying deposit of at least USD 100.",
          400,
        );
      const changed = await db.$transaction(async (tx) => {
        // Lock the principal's profile before membership, matching profile edits.
        await tx.user.update({ where: { id: user.id }, data: { profileVersion: { increment: data.mt5Account ? 1 : 0 } } });
        await tx.membership.upsert({
          where: { userId: user.id },
          create: { userId: user.id, plan: "FREE" },
          update: {},
        });
        const result = await tx.membership.updateMany({
          where: {
            userId: user.id,
            version: data.version,
            status: { not: "APPROVED" },
          },
          data: {
            status: "PENDING",
            plan: "FREE",
            entitlements: [],
            version: { increment: 1 },
            brokerName: IB_POLICY.broker,
            ibCode: IB_POLICY.ibCode,
            accountSuffix: data.mt5Account?.slice(-4) ?? data.accountSuffix,
            claimedDepositCents: cents,
            depositReference: data.depositReference ?? null,
            requestedAt: new Date(),
            verifiedBroker: null,
            verifiedIbCode: null,
            verifiedDepositCents: null,
            verifiedById: null,
            verifiedAt: null,
            reviewReason: null,
          },
        });
        if (!result.count) return false;
        if (data.mt5Account) await tx.user.update({ where: { id: user.id }, data: { mt5Account: data.mt5Account, brokerName: IB_POLICY.broker } });
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            targetId: user.id,
            action: "MEMBERSHIP_REQUESTED",
            details: { version: data.version + 1 },
          },
        });
        return true;
      });
      if (!changed)
        return message(
          "Membership changed or is already approved. Refresh before retrying.",
          409,
        );
      return jsonResponse({
        message:
          "Request submitted for admin verification. Access has not changed.",
        membership: await db.membership.findUnique({
          where: { userId: user.id },
          select: ownSelect,
        }),
      });
    }

    const id = url.pathname.match(
      /^\/api\/admin\/memberships\/([A-Za-z0-9_-]{1,100})\/review$/,
    )?.[1];
    if (!adminRoute || !id) return message("Not found.", 404);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success)
      return message(
        "Provide the action, current version and a review reason of at least 10 characters.",
        400,
      );
    const data = parsed.data;
    const cents = parseUsdToCents(data.verifiedDepositAmount);
    if (
      data.action === "approve" &&
      (data.confirmed !== true ||
        data.verifiedBroker !== IB_POLICY.broker ||
        data.verifiedIbCode !== IB_POLICY.ibCode ||
        cents === null ||
        cents < IB_POLICY.minimumDepositCents)
    )
      return message(
        "Confirm independent broker-record verification, the correct IB code and at least USD 100 deposited.",
        400,
      );
    let reviewEventId;
    const outcome = await db.$transaction(async (tx) => {
      const current = await tx.membership.findUnique({ where: { id }, include: { user: { select: { role: true, mt5Account: true, profileVersion: true } } } });
      if (!current) return 404;
      if (current.userId === user.id || current.user.role !== 'MEMBER') return 403;
      if (
        current.version !== data.version ||
        !(data.action === 'revoke' ? ['APPROVED'] : data.action === 'reject' ? ['PENDING'] : ['FREE', 'PENDING', 'REJECTED', 'REVOKED']).includes(current.status)
      )
        return 409;
      const accountSuffix = data.verifiedAccountSuffix ?? current.accountSuffix;
      if (data.action === 'approve') {
        if (!accountSuffix || !/^\d{4}$/.test(accountSuffix)) return 400;
        if (data.profileVersion !== undefined && data.profileVersion !== current.user.profileVersion) return 409;
        if (current.status !== 'PENDING' && data.profileVersion === undefined) return 400;
        if (current.user.mt5Account && accountSuffix !== current.user.mt5Account.slice(-4)) return 400;
        // Serialize approval with profile edits, which lock the user before
        // revoking membership. A racing account change cannot retain access.
        const stableProfile = await tx.user.updateMany({ where: { id: current.userId, profileVersion: data.profileVersion ?? current.user.profileVersion }, data: { profileVersion: { increment: 0 } } });
        if (!stableProfile.count) return 409;
      }
      const status =
        data.action === "approve"
          ? "APPROVED"
          : data.action === "reject"
            ? "REJECTED"
            : "REVOKED";
      const result = await tx.membership.updateMany({
        where: { id, version: data.version, status: current.status },
        data: {
          status,
          version: { increment: 1 },
          plan: status === "APPROVED" ? "IB_MEMBER" : "FREE",
          entitlements: status === "APPROVED" ? ["member_features"] : [],
          reviewReason: data.action === 'approve' ? null : data.reason,
          ...(status === "APPROVED"
            ? {
                verifiedDepositCents: cents,
                verifiedIbCode: IB_POLICY.ibCode,
                verifiedBroker: IB_POLICY.broker,
                verifiedAt: new Date(),
                verifiedById: user.id,
                brokerName: IB_POLICY.broker,
                ibCode: IB_POLICY.ibCode,
                accountSuffix,
              }
            : {}),
        },
      });
      if (!result.count) return 409;
      const reviewEvent = await tx.auditEvent.create({
        data: {
          actorId: user.id,
          targetId: current.userId,
          action: `MEMBERSHIP_${status}`,
          details: {
            membershipId: id,
            version: data.version + 1,
            status,
            previousStatus: current.status,
            reason: data.action === 'approve' ? 'Independent IB and qualifying deposit verification confirmed.' : data.reason,
            ...(data.action === 'revoke' ? { reasonCode: data.reasonCode } : {}),
            ...(status === "APPROVED" ? { verifiedDepositCents: cents } : {}),
          },
        },
      });
      reviewEventId = reviewEvent.id;
      return 200;
    });
    let notification = 'not_queued';
    if (outcome === 200 && reviewEventId) {
      notification = membershipEmailQueue.enqueue(reviewEventId);
      if (notification !== 'queued') {
        try { await db.auditEvent.create({data:{actorId:user.id,action:notification==='busy'?'MEMBERSHIP_EMAIL_BUSY':'MEMBERSHIP_EMAIL_UNCONFIGURED',details:{eventId:reviewEventId}}}); } catch { /* Review is committed; email cannot undo access changes. */ }
      }
    }
    return message(
      outcome === 200
        ? `Membership review saved. ${notification === 'queued' ? 'Email notification queued.' : notification === 'busy' ? 'Email was not queued; notification service is busy.' : 'Email notification is not configured.'}`
        : outcome === 409
          ? "Membership changed. Refresh before reviewing."
          : outcome === 403
            ? "You cannot review your own membership."
            : outcome === 404
              ? "Membership not found."
              : "Membership does not match the configured IB policy.",
      outcome,
    );
  } catch {
    return message(
      "Membership service unavailable. No access has been granted.",
      503,
    );
  }
}
