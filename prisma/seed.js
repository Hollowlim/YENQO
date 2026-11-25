import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../apps/web/server/security.js";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env");
} catch {
  /* Host may provide environment variables. */
}
const db = new PrismaClient();
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is disabled in production.");
try {
  for (const [
    email,
    name,
    role,
    password,
  ] of /** @type {[string, string, import('@prisma/client').Role, string | undefined][]} */ ([
    [
      "member@yengfx.test",
      "Demo Member",
      "MEMBER",
      process.env.DEMO_MEMBER_PASSWORD,
    ],
    [
      "admin@yengfx.test",
      "Demo Admin",
      "ADMIN",
      process.env.DEMO_ADMIN_PASSWORD,
    ],
  ])) {
    if (await db.user.findUnique({ where: { email } })) continue;
    if (!password || password.length < 12)
      throw new Error(
        "Set DEMO_MEMBER_PASSWORD and DEMO_ADMIN_PASSWORD locally (12+ characters).",
      );
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        role,
        passwordHash: await hashPassword(password),
        membership: { create: { plan: "FREE", entitlements: [] } },
      },
    });
  }
  console.log(
    "Demo accounts ready: member@yengfx.test and admin@yengfx.test. Passwords were not printed.",
  );
} finally {
  await db.$disconnect();
}
