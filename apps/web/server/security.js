import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
/** @returns {Promise<Buffer>} */
const derive = (password, salt) =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const [version, salt, hash, extra] = encoded.split(":");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hash ?? "") ||
    extra !== undefined
  )
    return false;
  return timingSafeEqual(
    await derive(password, salt),
    Buffer.from(hash, "hex"),
  );
}
export const newToken = () => randomBytes(32).toString("base64url");
export const digestToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export const sessionIsValid = (session, now = new Date()) =>
  Boolean(session && session.expiresAt > now);
export const canAccessAdmin = (user) => user?.role === "ADMIN";
export const ownsResource = (user, ownerId) =>
  Boolean(user && user.id === ownerId);
export const isSameOrigin = (origin, expected) => origin === expected;
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12, "Use at least 12 characters.").max(256);
export const emailSchema = z.object({ email });
export const credentialsSchema = z.object({
  email,
  password: z.string().min(1).max(256),
});
export const brokerFields = {
  brokerName: z.string().trim().max(60).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)).default(''),
  mt5Account: z.string().trim().regex(/^(?:[0-9]{4,20})?$/).default(''),
  mt5Server: z.string().trim().max(100).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)).default(''),
};
export const completeBrokerDetails = value => Boolean(value.brokerName) === Boolean(value.mt5Account) && (!value.mt5Server || Boolean(value.mt5Account));
export const registrationSchema = z.object({
  // Username/role/verification fields are deliberately not accepted on signup.
  name: z.string().trim().min(2).max(80),
  email,
  password,
  ...brokerFields,
}).refine(completeBrokerDetails, 'Provide both broker and MT5 account number, or leave both blank.');
export const adminCredentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  password: z.string().min(1).max(256),
});
export const resetSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password,
});
