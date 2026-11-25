// Privileged local-only setup. Secrets come from ignored .env, never browser code.
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  adminCredentialsSchema,
} from "../apps/web/server/security.js";
try {
  loadEnvFile(".env");
} catch {
  /* Host may provide values. */
}
if (process.env.NODE_ENV === "production")
  throw new Error("Local admin bootstrap is disabled in production.");
const parsed = adminCredentialsSchema.safeParse({
  username: process.env.LOCAL_ADMIN_USERNAME,
  password: process.env.LOCAL_ADMIN_PASSWORD,
});
const email = process.env.LOCAL_ADMIN_EMAIL;
if (!parsed.success || !email || parsed.data.password.length < 8)
  throw new Error(
    "Set LOCAL_ADMIN_USERNAME, LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD (8+ characters) locally.",
  );
const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN")
    throw new Error(
      "Bootstrap can configure only an existing local ADMIN; it cannot promote a member.",
    );
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { username: parsed.data.username, passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        targetId: user.id,
        action: "ADMIN_LOCAL_LOGIN_CONFIGURED",
        details: { source: "local-cli" },
      },
    });
  });
  console.log(
    "Local administrator username and hashed password configured. Existing sessions revoked. No secret was printed.",
  );
} finally {
  await db.$disconnect();
}
