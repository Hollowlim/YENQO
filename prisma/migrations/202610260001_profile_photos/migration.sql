CREATE TABLE "ProfilePhoto" (
  "userId" TEXT NOT NULL,
  "imageData" BYTEA NOT NULL,
  "imageHash" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "ProfilePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfilePhoto_size" CHECK (octet_length("imageData") BETWEEN 1 AND 524288),
  CONSTRAINT "ProfilePhoto_hash" CHECK ("imageHash" ~ '^[a-f0-9]{64}$')
);
ALTER TABLE "ProfilePhoto" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProfilePhoto" FROM PUBLIC;
DO $$ DECLARE role_name TEXT; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
   EXECUTE format('REVOKE ALL ON TABLE public."ProfilePhoto" FROM %I', role_name);
  END IF;
 END LOOP;
END $$;
