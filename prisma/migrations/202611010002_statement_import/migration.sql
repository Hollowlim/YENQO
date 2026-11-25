CREATE TABLE "StatementHistory" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
 "login" TEXT NOT NULL CHECK ("login" ~ '^[0-9]{4,20}$'),
 "server" TEXT NOT NULL,
 "currency" TEXT NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
 "deals" JSONB NOT NULL CHECK (jsonb_typeof("deals") = 'array'),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "historyFrom" TIMESTAMP(3) NOT NULL,
 "historyTo" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "StatementHistory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StatementHistory" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "StatementHistory" FROM anon; END IF;
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "StatementHistory" FROM authenticated; END IF;
END $$;
