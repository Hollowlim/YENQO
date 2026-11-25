import { loadEnvFile } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
loadEnvFile('.env');
const localUrl = process.env.DATABASE_URL;
loadEnvFile('.env.supabase');
const remoteUrl = process.env.SUPABASE_DATABASE_URL;
const local = new URL(localUrl ?? ''), remote = new URL(remoteUrl ?? '');
if (!['127.0.0.1','localhost'].includes(local.hostname)) throw new Error('Refused: current database is not the local development database.');
if (decodeURIComponent(remote.username) !== 'postgres.xammdrkwxonffxvmsjpi' || remote.searchParams.get('sslaccept') !== 'strict' || !remote.searchParams.get('sslcert')) throw new Error('Unexpected remote project or certificate settings.');
const source = new PrismaClient({ datasources: { db: { url: localUrl } } });
const destination = new PrismaClient({ datasources: { db: { url: remoteUrl } } });
try {
  const admin = await source.user.findUnique({ where: { username: 'YENGFX' }, select: { name: true, email: true, username: true, passwordHash: true, role: true } });
  if (!admin || admin.role !== 'ADMIN' || !admin.passwordHash.startsWith('scrypt-v1:')) throw new Error('Configured local administrator is unavailable.');
  if (await destination.user.count()) throw new Error('Refused: remote users already exist; administrator setup requires review.');
  await destination.$transaction(async tx => {
    const created = await tx.user.create({ data: admin });
    await tx.auditEvent.create({ data: { actorId: created.id, targetId: created.id, action: 'ADMIN_CLOUD_INITIALIZED', details: { source: 'existing-local-admin-hash', project: 'xammdrkwxonffxvmsjpi' } } });
  });
  const environment = await readFile('.env', 'utf8');
  await writeFile('.env.local-database', `# Original local database connection, retained privately.\nDATABASE_URL=${localUrl}\n`);
  await writeFile('.env', environment.replace(/^DATABASE_URL=.*$/m, () => `DATABASE_URL=${remoteUrl}`));
  console.log('Existing administrator hash initialized in Supabase. Website DATABASE_URL switched privately. Original local connection retained in gitignored .env.local-database. No passwords were displayed.');
} catch { console.error('Activation failed; inspect setup prerequisites privately. Credentials and database details omitted.'); process.exitCode = 1; }
finally { await source.$disconnect(); await destination.$disconnect(); }
