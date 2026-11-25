// Generates a fresh-project bootstrap from the authoritative Prisma migrations.
// No environment variables, secrets, database connection or existing data are read.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
const directories = (await readdir('prisma/migrations', { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
let sql = `-- YENGFX HUB: fresh Supabase project only. Review before running.\n-- Existing application tables are never dropped or overwritten.\nBEGIN;\nDO $$ BEGIN\n IF to_regclass('public."User"') IS NOT NULL OR to_regclass('public._prisma_migrations') IS NOT NULL THEN\n RAISE EXCEPTION 'Application tables already exist. Use normal Prisma migrations instead of this bootstrap.';\n END IF;\nEND $$;\nCREATE TABLE public._prisma_migrations (\n id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0\n);\n`;
for (const name of directories) {
  const migration = await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8');
  const checksum = createHash('sha256').update(migration).digest('hex');
  sql += `\n-- ${name}\n${migration}\nINSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('${randomUUID()}', '${checksum}', now(), '${name.replaceAll("'", "''")}', 1);\n`;
}
sql += '\nCOMMIT;\n';
await mkdir('supabase', { recursive: true });
await writeFile('supabase/yengfx-bootstrap.sql', sql);
console.log(`Prepared fresh-project bootstrap for ${directories.length} Prisma migrations. No database was changed.`);
