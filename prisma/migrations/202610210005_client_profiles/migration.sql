ALTER TABLE "User" ADD COLUMN "brokerName" TEXT, ADD COLUMN "mt5Account" TEXT, ADD COLUMN "mt5Server" TEXT, ADD COLUMN "profileVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "client_profile_account" CHECK (
 ("brokerName" IS NULL AND "mt5Account" IS NULL AND "mt5Server" IS NULL) OR
 ("brokerName" IS NOT NULL AND char_length("brokerName") BETWEEN 1 AND 60 AND "mt5Account" IS NOT NULL AND "mt5Account" ~ '^[0-9]{4,20}$' AND ("mt5Server" IS NULL OR char_length("mt5Server") BETWEEN 1 AND 100))
);
ALTER TABLE "User" ADD CONSTRAINT "client_profile_version" CHECK ("profileVersion" >= 0);
CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");
