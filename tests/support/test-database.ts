export function requireLocalTestDatabase(connection = process.env.DATABASE_URL) {
  const host = new URL(connection ?? '').hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
    throw new Error('Full test suites are blocked against hosted databases. Configure an isolated local database and app before running them.');
}
