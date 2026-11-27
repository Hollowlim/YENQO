-- Paid plans replace IB verification. Existing rows keep their data; only a new nullable column is added.
ALTER TABLE "Membership" ADD COLUMN "accessUntil" TIMESTAMP(3);
