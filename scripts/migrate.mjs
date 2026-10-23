// Applies the SQL files in drizzle/ in filename order, each once, and records them in the
// "_migrations" table. Each file runs in its own transaction, so a failing file leaves nothing
// half-applied and stops the run.
//
//   pnpm db:migrate              apply pending migrations
//   pnpm db:migrate --baseline   mark every file as applied without running it (for a database
//                                whose schema is already up to date, e.g. an existing dev database)
//
// DATABASE_URL comes from the environment, or from .env when one exists.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

if (existsSync('.env')) process.loadEnvFile('.env');

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const dir = path.resolve('drizzle');
const baseline = process.argv.includes('--baseline');
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
	await sql`
		CREATE TABLE IF NOT EXISTS _migrations (
			name text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)`;

	const applied = new Set((await sql`SELECT name FROM _migrations`).map((r) => r.name));
	const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
	const pending = files.filter((f) => !applied.has(f));

	if (pending.length === 0) {
		console.log('Database is up to date');
	}

	for (const file of pending) {
		if (baseline) {
			await sql`INSERT INTO _migrations (name) VALUES (${file})`;
			console.log(`baselined ${file}`);
			continue;
		}
		const body = await readFile(path.join(dir, file), 'utf8');
		await sql.begin(async (tx) => {
			await tx.unsafe(body);
			await tx`INSERT INTO _migrations (name) VALUES (${file})`;
		});
		console.log(`applied   ${file}`);
	}
} catch (err) {
	console.error(err.message ?? err);
	process.exitCode = 1;
} finally {
	await sql.end();
}
