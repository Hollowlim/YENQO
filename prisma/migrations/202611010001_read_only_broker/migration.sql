CREATE TABLE "BrokerConnection" (
 "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "broker" TEXT NOT NULL,
 "login" TEXT NOT NULL,
 "server" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL UNIQUE,
 "providerAccountId" TEXT UNIQUE,
 "state" TEXT NOT NULL DEFAULT 'CONNECTING',
 "version" INTEGER NOT NULL DEFAULT 0,
 "leaseUntil" TIMESTAMP(3),
 "currency" TEXT,
 "lastSyncedAt" TIMESTAMP(3),
 "historyFrom" TIMESTAMP(3),
 "historyTo" TIMESTAMP(3),
 "deals" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BrokerConnection_state" CHECK ("state" IN ('CONNECTING','READY','SYNCING','ERROR','REMOVING')),
 CONSTRAINT "BrokerConnection_login" CHECK ("login" ~ '^[0-9]{4,20}$'),
 CONSTRAINT "BrokerConnection_currency" CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
 CONSTRAINT "BrokerConnection_snapshot" CHECK ("deals" IS NULL OR jsonb_typeof("deals")='array')
);
ALTER TABLE "BrokerConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BrokerConnection" FROM PUBLIC;
DO $$ DECLARE role_name TEXT; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON TABLE public."BrokerConnection" FROM %I',role_name);
  END IF;
 END LOOP;
END $$;
