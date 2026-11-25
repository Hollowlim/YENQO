# Supabase client database setup

Requested project: `xammdrkwxonffxvmsjpi`, owned through the user's **hollowlim** account. The connected Supabase integration currently lists **LingLeeChoon’s Org**, returns no projects and denies access to the requested project. Reconnecting did not change that response during this run.

**Hosted deployment status: applied and connected.** After the private credentials were corrected, authentication and SELECT 1 succeeded. The public schema was confirmed empty, then the prepared website schema and nine matching Prisma migration receipts were applied. The website now uses Supabase through its private `DATABASE_URL` with strict TLS verification.

The supplied CA certificate is stored at `supabase/prod-ca-2021.crt`. Keep the SSL/certificate parameters when editing the private URI. The existing local administrator's scrypt hash was initialized in Supabase without displaying or storing a new plaintext password. Other local users and content were not migrated. The previous local connection is retained privately in gitignored `.env.local-database`.

Hosted verification passed: registration with broker/MT5 details, hashed password persistence, member login/session, own-profile reading, rejection of member admin access, existing admin login, admin client-directory viewing, and all twelve app tables having RLS enabled with no anon/authenticated table grants. The single synthetic smoke-test client was removed. Full integration/browser suites are now blocked against hosted databases; use an isolated local database and app for those suites.

## Implemented locally

- Sign-up accepts client name/email/password and optional paired broker + MT5 account number, plus an optional broker server. Existing sign-up without broker details still works.
- Account Settings lets authenticated clients save their own broker/MT5 details. Account numbers remain strings so leading zeroes are preserved. No MT5 password is collected.
- Admin → Members (`/admin/members`) includes all registered member accounts, searchable by name, email, broker or account number. Password hashes, sessions and reset tokens are excluded. Reads are audited.
- `/api/profile` derives the owner from the session; caller-provided user IDs and roles cannot change the target. Updates use revision checks. Changing broker/account details revokes pending/approved IB verification and requires a new review.
- These fields are client-provided details, not broker ownership verification, telemetry or trading authority. There is one primary broker account per client in this version.

This setup preserves the existing scrypt-password and database-session login flow, hosted on Supabase PostgreSQL when connected. It does **not** switch the application to Supabase Auth. Application registrations will appear in `public."User"`, not Supabase's Auth → Users screen. No browser Supabase service-role key is needed or exposed.

## Connection and deployment reference

The Supabase integration still does not have project access. Deployment used the verified private PostgreSQL connection instead. Reconnecting the Supabase integration is optional for future connector-based administration; signing the GitHub integration into hollowlim alone does not change Supabase authorization.

Alternative: copy `.env.supabase.example` to `.env.supabase`. In the project’s **Connect → Session pooler** dialog, obtain the actual connection string and save it privately as `SUPABASE_DATABASE_URL`. Replace/URL-encode the database password locally. Use the actual pooler host, port 5432 and SSL options shown in the example. Do not paste passwords or connection strings into chat. `.env.supabase` is gitignored. Leave `.env` unchanged until local testing and hosted deployment are complete.

For a genuinely fresh project, `supabase/yengfx-bootstrap.sql` is ready for review in Supabase SQL Editor. It creates the website tables from the authoritative Prisma migration files and writes matching Prisma migration receipts. It refuses to run if application tables or Prisma history already exist, and never drops existing tables. For an existing application database, use normal `prisma migrate deploy` instead; do not force the bootstrap.

Application tables have RLS enabled and grants revoked from public/anonymous/authenticated API roles. The app uses its existing authenticated Node server and a private owner database connection. No browser table policies are granted because its session IDs are not Supabase JWT user IDs. Keep DB credentials server-only. After cloud access is restored, inspect the actual schema, apply the appropriate migration path, run Supabase security advisors and verify the private connection.

Commands (Windows portable wrapper):

```powershell
scripts\pnpm.cmd supabase:prepare   # Regenerate reviewed SQL; no database mutation
scripts\pnpm.cmd supabase:validate  # Validate bootstrap in a fresh in-memory local database
scripts\pnpm.cmd supabase:check     # Read-only hosted check using .env.supabase
```

Hosted schema/connection verification and administrator provisioning are complete. The server was restarted using Supabase. Only the administrator was initialized; no other local users/content were copied. Do not run full integration/browser suites against the hosted database: those suites create fixtures and clear test rate limits. Their configuration now refuses remote hosts.

## Verification in this run

- `scripts\pnpm.cmd db:generate`, `db:migrate`: successful locally; migrations `202610210005_client_profiles` and `202610210006_private_database_access` applied.
- `scripts\pnpm.cmd build`: 31 offline screens exported, HTML and JavaScript checked.
- `scripts\pnpm.cmd lint`, `typecheck`: passed.
- `scripts\pnpm.cmd test`: 32 unit tests passed after adding the hosted-database test guard.
- `scripts\pnpm.cmd test:integration`: 54 passed, including registration persistence, own-profile isolation, admin projection, invalid inputs, stale revisions and verification invalidation.
- `scripts\pnpm.cmd test:e2e`: 60 passed across desktop, iPad and mobile, including registration → profile update → admin directory review.
- Bootstrap validation: fresh database creation succeeded with nine migration receipts and twelve RLS-protected app tables; an unsafe rerun was refused.
- `scripts\pnpm.cmd supabase:check`: authenticated connection, client-field schema and private-table RLS checks passed against Supabase.
- `node scripts/smoke-supabase-auth.mjs`: hosted signup/login/admin-directory and permission checks passed; the synthetic client was removed.
- Read-only code review found no actionable security/correctness issues in the earlier profile implementation. Connector-based Supabase advisors remain unavailable; direct SQL checks verified all twelve tables have RLS and deny anon/authenticated table access.

Screenshots: `docs/screenshots/{desktop,ipad,mobile}-client-directory.png`, using synthetic client accounts. No live MT5 trading was enabled.
