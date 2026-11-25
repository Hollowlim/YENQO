CREATE TABLE "PcConnector" (
 "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "publicKey" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true, "lastSeenAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PcBrokerAccount" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
 "connectorId" TEXT NOT NULL REFERENCES "PcConnector"("id") ON DELETE CASCADE,
 "login" TEXT NOT NULL CHECK ("login" ~ '^[0-9]{4,20}$'), "server" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'AWAITING_PASSWORD' CHECK ("state" IN ('AWAITING_PASSWORD','QUEUED','CONNECTING','ACTIVE','ERROR','NEEDS_PASSWORD','REVOKED')),
 "generation" INTEGER NOT NULL DEFAULT 1, "version" INTEGER NOT NULL DEFAULT 1, "nonce" TEXT NOT NULL,
 "sealedPassword" TEXT, "secretExpiresAt" TIMESTAMP(3), "leaseHash" TEXT, "leaseUntil" TIMESTAMP(3), "nextSyncAt" TIMESTAMP(3),
 "currency" TEXT, "accountType" TEXT, "deals" JSONB, "lastSyncedAt" TIMESTAMP(3), "historyFrom" TIMESTAMP(3), "historyTo" TIMESTAMP(3),
 "errorCode" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("deals" IS NULL OR jsonb_typeof("deals")='array'), CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$')
);
CREATE INDEX "PcBrokerAccount_connectorId_state_nextSyncAt_idx" ON "PcBrokerAccount"("connectorId","state","nextSyncAt");
ALTER TABLE "PcConnector" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PcBrokerAccount" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PcConnector","PcBrokerAccount" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "PcConnector","PcBrokerAccount" FROM anon; END IF;
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "PcConnector","PcBrokerAccount" FROM authenticated; END IF;
END $$;
