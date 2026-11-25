import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const database = new PGlite();
try {
  const sql = await readFile('supabase/yengfx-bootstrap.sql', 'utf8');
  await database.exec(sql);
  const migrations = await database.query('SELECT count(*)::int AS count FROM public._prisma_migrations');
  const tables = await database.query("SELECT count(*)::int AS count FROM pg_class JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE nspname='public' AND relname IN ('User','Session','PasswordReset','Membership','RateLimit','AuditEvent','CommunityMessage','CommunityReport','DailyPlan','ManualSignal','VideoLesson','_prisma_migrations') AND relrowsecurity");
  if (migrations.rows[0].count !== 9 || tables.rows[0].count !== 12) throw new Error('Bootstrap validation failed.');
  let protectedExisting = false;
  try { await database.exec(sql); } catch { protectedExisting = true; await database.exec('ROLLBACK'); }
  if (!protectedExisting) throw new Error('Bootstrap did not protect existing tables.');
  console.log('Fresh-database bootstrap passed: 9 migration receipts, 12 RLS-protected app tables, rerun refused. No hosted database was changed.');
} finally { await database.close(); }
