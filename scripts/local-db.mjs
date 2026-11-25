// Optional local-only PostgreSQL-compatible test server. Docker PostgreSQL is preferred.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const db = await PGlite.create('./.local-postgres');
const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5433, maxConnections: 50, idleTimeout: 60000 });
await server.start();
console.log('Development PGlite listening on 127.0.0.1:5433. Not for production.');
const shutdown = async () => { await server.stop(); await db.close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
