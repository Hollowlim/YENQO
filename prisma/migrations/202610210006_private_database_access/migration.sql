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
