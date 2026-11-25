import { db } from "./db.js";
import { digestToken } from "./security.js";
export async function takeRateLimit(scope, identifier, limit, windowSeconds) {
  const key = `${scope}:${digestToken(identifier)}`;
  const rows = /** @type {{hits: number}[]} */ (
    await db.$queryRaw`
    INSERT INTO "RateLimit" ("key", "hits", "expiresAt")
    VALUES (${key}, 1, (NOW() AT TIME ZONE 'UTC') + (${windowSeconds} * INTERVAL '1 second'))
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimit"."expiresAt" <= (NOW() AT TIME ZONE 'UTC') THEN 1 ELSE "RateLimit"."hits" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= (NOW() AT TIME ZONE 'UTC') THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "hits"
  `
  );
  return rows[0].hits <= limit;
}
