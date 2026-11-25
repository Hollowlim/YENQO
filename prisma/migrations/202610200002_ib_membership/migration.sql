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
