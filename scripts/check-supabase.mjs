import { loadEnvFile } from 'node:process';
import { PrismaClient } from '@prisma/client';
try { loadEnvFile('.env.supabase'); } catch { /* Host environment is also supported. */ }
let url;
try { url = new URL(process.env.SUPABASE_DATABASE_URL ?? ''); } catch { console.error('Set SUPABASE_DATABASE_URL privately in .env.supabase first.'); process.exit(1); }
if (!/^(?:.+\.)?supabase\.(?:co|com)$/.test(url.hostname) || url.searchParams.get('sslmode') !== 'require' || url.searchParams.get('sslaccept') === 'accept_invalid_certs') {
  console.error('Use a Supabase PostgreSQL connection with sslmode=require and certificate verification enabled.'); process.exit(1);
}
const expectedProject = 'xammdrkwxonffxvmsjpi';
if (url.hostname !== `db.${expectedProject}.supabase.co` && decodeURIComponent(url.username) !== `postgres.${expectedProject}`) {
  console.error('The private connection does not identify the requested Supabase project. Check its Connect dialog.'); process.exit(1);
}
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
try {
  await db.$queryRaw`SELECT 1`;
  console.log('Supabase authentication and SELECT 1 succeeded.');
  const columns = await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name IN ('brokerName','mt5Account','mt5Server','profileVersion')`;
  if (columns.length !== 4) throw new Error('SCHEMA_MISSING');
  const rows = await db.$queryRaw`SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE nspname='public' AND relname IN ('User','Session','PasswordReset','Membership','AuditEvent','CommunityMessage','VideoLesson')`;
  if (rows.length !== 7 || rows.some(row => !row.relrowsecurity)) throw new Error('RLS_MISSING');
  console.log('Supabase connection, client fields and private-table RLS checks passed. No client data was printed or modified.');
} catch (error) {
  const reason = error instanceof Error ? error.message : '';
  if (reason === 'SCHEMA_MISSING') console.error('Connection works; website tables/client fields have not been applied yet.');
  else if (reason === 'RLS_MISSING') console.error('Connection works; private-table RLS setup is incomplete.');
  else if (/tls|ssl|certificate/i.test(reason)) console.error('Connection failed during TLS certificate verification. Credentials omitted.');
  else if (/authentication failed|password authentication/i.test(reason)) console.error('Database authentication failed. Check the saved database password privately.');
  else console.error('Supabase connection failed. Check network and private connection settings. Credentials and database error details omitted.');
  process.exitCode = 1;
}
finally { await db.$disconnect(); }
