-- YENGFX HUB: fresh Supabase project only. Review before running.
-- Existing application tables are never dropped or overwritten.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public."User"') IS NOT NULL OR to_regclass('public._prisma_migrations') IS NOT NULL THEN
 RAISE EXCEPTION 'Application tables already exist. Use normal Prisma migrations instead of this bootstrap.';
 END IF;
END $$;
CREATE TABLE public._prisma_migrations (
 id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0
);

-- 202610200001_foundation
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FOUNDATION_DEMO',
    "entitlements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_key" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('3d1bc0f3-c240-4d73-85be-f30afcc4a985', '3384a164556fdeb334e7f86a28179110ac049899fb5fffa4ecb23416bc7d6b7e', now(), '202610200001_foundation', 1);

-- 202610200002_ib_membership
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('FREE', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "accountSuffix" TEXT,
ADD COLUMN     "brokerName" TEXT,
ADD COLUMN     "claimedDepositCents" INTEGER,
ADD COLUMN     "depositReference" TEXT,
ADD COLUMN     "ibCode" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBroker" TEXT,
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "verifiedDepositCents" INTEGER,
ADD COLUMN     "verifiedIbCode" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "details" JSONB,
ADD COLUMN     "targetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Membership_status_requestedAt_idx" ON "Membership"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing demo plans do not qualify as broker/deposit verification.
UPDATE "Membership" SET "plan" = 'FREE', "entitlements" = ARRAY[]::TEXT[];
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_nonnegative_amounts"
CHECK (("claimedDepositCents" IS NULL OR "claimedDepositCents" >= 0)
AND ("verifiedDepositCents" IS NULL OR "verifiedDepositCents" >= 0) AND "version" >= 0);
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_approved_evidence"
CHECK ("status" <> 'APPROVED' OR ("verifiedDepositCents" >= 10000 AND "verifiedDepositCents" IS NOT NULL
AND "verifiedBroker" IS NOT NULL AND "verifiedIbCode" IS NOT NULL AND "verifiedAt" IS NOT NULL));

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('6a907d7e-cf6b-4b3d-b606-96fe9ec9db2e', '9643862d8b418b09d216e610de3d1daeb35bc47d2991a4c08fd4d0e9aec9a7e2', now(), '202610200002_ib_membership', 1);

-- 202610200003_community
CREATE TABLE "CommunityMessage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "clientKey" TEXT NOT NULL,
 "text" TEXT NOT NULL CHECK (char_length("text") BETWEEN 1 AND 2000),
 "chartUrl" TEXT CHECK ("chartUrl" IS NULL OR char_length("chartUrl") <= 1000),
 "replyToId" TEXT REFERENCES "CommunityMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "hiddenAt" TIMESTAMP(3),
 CHECK ("replyToId" IS NULL OR "replyToId" <> "id")
);
CREATE UNIQUE INDEX "CommunityMessage_authorId_clientKey_key" ON "CommunityMessage"("authorId", "clientKey");
CREATE INDEX "CommunityMessage_createdAt_id_idx" ON "CommunityMessage"("createdAt", "id");
CREATE INDEX "CommunityMessage_replyToId_idx" ON "CommunityMessage"("replyToId");
CREATE TABLE "CommunityReport" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "messageId" TEXT NOT NULL REFERENCES "CommunityMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "reason" TEXT NOT NULL CHECK (char_length("reason") BETWEEN 5 AND 500),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CommunityReport_messageId_reporterId_key" ON "CommunityReport"("messageId", "reporterId");
CREATE INDEX "CommunityReport_createdAt_id_idx" ON "CommunityReport"("createdAt", "id");

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('2a749e57-2540-46ab-807e-e09977b81e1c', '3d437dfe11977359d8989c55ae4fe8653794f928e21a989bf5286fe37e5c156d', now(), '202610200003_community', 1);

-- 202610210001_editorial
CREATE TYPE "EditorialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "MarketBias" AS ENUM ('BULLISH', 'BEARISH', 'SIDEWAY');
CREATE TABLE "DailyPlan" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "planDate" TEXT NOT NULL,
 "title" TEXT NOT NULL CHECK (char_length("title") BETWEEN 1 AND 120),
 "description" TEXT NOT NULL CHECK (char_length("description") BETWEEN 1 AND 6000),
 "bias" "MarketBias" NOT NULL,
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "publishedAt" TIMESTAMP(3),
 CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "DailyPlan_planDate_key" ON "DailyPlan"("planDate");
CREATE INDEX "DailyPlan_status_planDate_idx" ON "DailyPlan"("status", "planDate");
CREATE TABLE "ManualSignal" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "requestKey" TEXT NOT NULL,
 "title" TEXT NOT NULL CHECK (char_length("title") BETWEEN 1 AND 120),
 "side" TEXT NOT NULL CHECK ("side" IN ('BUY', 'SELL')),
 "category" TEXT NOT NULL CHECK ("category" IN ('SCALPING', 'INTERDAY')),
 "zoneLow" DECIMAL(14,3) NOT NULL CHECK ("zoneLow" > 0),
 "zoneHigh" DECIMAL(14,3) NOT NULL,
 "sl" DECIMAL(14,3) NOT NULL CHECK ("sl" > 0),
 "tp1" DECIMAL(14,3) NOT NULL CHECK ("tp1" > 0),
 "tp2" DECIMAL(14,3) NOT NULL CHECK ("tp2" > 0),
 "tp3" DECIMAL(14,3) NOT NULL CHECK ("tp3" > 0),
 "notes" TEXT NOT NULL DEFAULT '' CHECK (char_length("notes") <= 1500),
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "publishedAt" TIMESTAMP(3),
 CHECK ("zoneHigh" > "zoneLow"),
 CHECK (("side" = 'BUY' AND "sl" < "zoneLow" AND "tp1" > "zoneHigh" AND "tp2" > "tp1" AND "tp3" > "tp2") OR ("side" = 'SELL' AND "sl" > "zoneHigh" AND "tp1" < "zoneLow" AND "tp2" < "tp1" AND "tp3" < "tp2")),
 CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "ManualSignal_requestKey_key" ON "ManualSignal"("requestKey");
CREATE INDEX "ManualSignal_status_createdAt_id_idx" ON "ManualSignal"("status", "createdAt", "id");

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('292fcd69-3542-4fa5-a531-ae5fcac26f7c', 'e469af26caa34b204c9e9133f9b7e5182f5a847abaf797499cf456e63fd396d3', now(), '202610210001_editorial', 1);

-- 202610210002_video_lessons
CREATE TABLE "VideoLesson" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
 "filename" TEXT UNIQUE, "bytes" INTEGER, "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "publishedAt" TIMESTAMP(3),
 CONSTRAINT "lesson_text" CHECK (length("title") BETWEEN 1 AND 120 AND length("description") BETWEEN 1 AND 6000),
 CONSTRAINT "lesson_video" CHECK (("filename" IS NULL AND "bytes" IS NULL) OR ("filename" ~ '^[a-f0-9-]{36}\.mp4$' AND "bytes" BETWEEN 24 AND 524288000)),
 CONSTRAINT "lesson_published" CHECK ("status" <> 'PUBLISHED' OR ("filename" IS NOT NULL AND "publishedAt" IS NOT NULL)),
 CONSTRAINT "lesson_version" CHECK ("version" > 0)
);
CREATE INDEX "VideoLesson_status_createdAt_id_idx" ON "VideoLesson"("status", "createdAt", "id");

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('cabf7366-71e5-42c0-9279-9f54af59817f', '1b577bdaa5c6dfc0d8f2013dddfc7a7796fc85b73416cce71ce28ea35a36b015', now(), '202610210002_video_lessons', 1);

-- 202610210003_community_photos
ALTER TABLE "CommunityMessage" ADD COLUMN "imageData" BYTEA, ADD COLUMN "imageHash" TEXT;
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_image_bounds" CHECK (
 ("imageData" IS NULL AND ("imageHash" IS NULL OR "hiddenAt" IS NOT NULL)) OR
 ("imageData" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$' AND octet_length("imageData") BETWEEN 1 AND 5242880)
);

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('a938a4ad-8c75-417a-89e9-3aae9fc008e1', '09f690926afc85bda081ed75023e67779e51042fdd48b75f0b3852892733fa8c', now(), '202610210003_community_photos', 1);

-- 202610210004_photo_message_constraints
ALTER TABLE "CommunityMessage" DROP CONSTRAINT "CommunityMessage_text_check";
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_message_content" CHECK (
 char_length("text") BETWEEN 0 AND 2000 AND
 (char_length("text") > 0 OR "imageHash" IS NOT NULL)
);
ALTER TABLE "CommunityMessage" DROP CONSTRAINT "community_image_bounds";
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_image_bounds" CHECK (
 ("imageData" IS NULL AND ("imageHash" IS NULL OR ("hiddenAt" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$'))) OR
 ("imageData" IS NOT NULL AND "imageHash" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$' AND octet_length("imageData") BETWEEN 1 AND 5242880)
);

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('d6039d88-48fc-4a99-b77b-e09dac089415', '2f7c10ad4f40727e8246ea36104d955cda4e34bb3b57f072bdcb08591f43fd03', now(), '202610210004_photo_message_constraints', 1);

-- 202610210005_client_profiles
ALTER TABLE "User" ADD COLUMN "brokerName" TEXT, ADD COLUMN "mt5Account" TEXT, ADD COLUMN "mt5Server" TEXT, ADD COLUMN "profileVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "client_profile_account" CHECK (
 ("brokerName" IS NULL AND "mt5Account" IS NULL AND "mt5Server" IS NULL) OR
 ("brokerName" IS NOT NULL AND char_length("brokerName") BETWEEN 1 AND 60 AND "mt5Account" IS NOT NULL AND "mt5Account" ~ '^[0-9]{4,20}$' AND ("mt5Server" IS NULL OR char_length("mt5Server") BETWEEN 1 AND 100))
);
ALTER TABLE "User" ADD CONSTRAINT "client_profile_version" CHECK ("profileVersion" >= 0);
CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('b3ca0ffd-4ee3-4292-b33b-76af81fda572', 'bcbff7948b0363005c68a07b8eaca79213e8f5348ca584df04bc6b6d172e807c', now(), '202610210005_client_profiles', 1);

-- 202610210006_private_database_access
-- The application uses server sessions and a private database connection, not
-- Supabase browser JWTs. No public Data API access is granted to app tables.
DO $$
DECLARE tab TEXT; role_name TEXT;
BEGIN
 FOREACH tab IN ARRAY ARRAY['User','Session','PasswordReset','Membership','RateLimit','AuditEvent','CommunityMessage','CommunityReport','DailyPlan','ManualSignal','VideoLesson','_prisma_migrations'] LOOP
  IF to_regclass(format('public.%I', tab)) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tab);
   EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', tab);
   FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
     EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', tab, role_name);
    END IF;
   END LOOP;
  END IF;
 END LOOP;
END $$;

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('758ab917-0e08-4a67-bb8b-af881365f82e', '289d757f976749c2ad76b3c94c2019e21f7676f94c463c749c82f3342efd5231', now(), '202610210006_private_database_access', 1);

COMMIT;
