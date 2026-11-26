import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// DATABASE_URL is Neon's pooled (-pooler) string: PgBouncer in transaction mode, so no
// prepared statements and no session state (SET, LISTEN/NOTIFY). Migrations use
// DATABASE_URL_UNPOOLED instead (scripts/migrate.mjs, drizzle.config.ts).
const client = postgres(env.DATABASE_URL!, { prepare: false, max: 10 });
export const db = drizzle(client, { schema });
