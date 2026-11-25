// Explicit fresh-project provisioner. Reads credentials only from private env.
import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
loadEnvFile('.env.supabase');
const url = new URL(process.env.SUPABASE_DATABASE_URL ?? '');
if (decodeURIComponent(url.username) !== 'postgres.xammdrkwxonffxvmsjpi' || url.hostname !== 'aws-0-ap-northeast-1.pooler.supabase.com' || url.searchParams.get('sslaccept') !== 'strict' || url.searchParams.get('sslmode') !== 'require') throw new Error('Unexpected project or TLS settings.');
const ca = await readFile(url.searchParams.get('sslcert') ?? 'supabase/prod-ca-2021.crt');
for (const key of ['sslmode','sslaccept','sslcert','sslrootcert']) url.searchParams.delete(key);
const client = new pg.Client({ connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true }, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  const result = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(JSON.stringify({ publicTables: result.rows.map(row => row.tablename) }));
  if (process.argv.includes('--apply')) {
    const appTables = ['User','Session','PasswordReset','Membership','RateLimit','AuditEvent','CommunityMessage','CommunityReport','DailyPlan','ManualSignal','VideoLesson','_prisma_migrations'];
    if (result.rows.some(row => appTables.includes(row.tablename))) throw new Error('EXISTING_APPLICATION_TABLES');
    await client.query(await readFile('supabase/yengfx-bootstrap.sql','utf8'));
    console.log('Fresh-project website schema and Prisma migration receipts applied successfully.');
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  if (error.message === 'EXISTING_APPLICATION_TABLES') console.error('Refused: application tables already exist. Use normal migrations; no tables were overwritten.');
  else console.error(`Database operation failed. Safe error code: ${/^[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'UNAVAILABLE'}. Credentials omitted.`);
  process.exitCode = 1;
} finally { await client.end(); }
