// Loads the demo data in scripts/seed/*.sql (the "basictest" store, its owner and products).
// For development and test databases only; never run it against production. Every statement is
// idempotent, so running it again is safe. Run migrations first: pnpm db:migrate && pnpm db:seed
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
if (process.env.NODE_ENV === 'production') {
	console.error('Refusing to seed demo data with NODE_ENV=production');
	process.exit(1);
}

const dir = path.resolve('scripts/seed');
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
	for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
		await sql.begin((tx) => readFile(path.join(dir, file), 'utf8').then((body) => tx.unsafe(body)));
		console.log(`seeded ${file}`);
	}
} catch (err) {
	console.error(err.message ?? err);
	process.exitCode = 1;
} finally {
	await sql.end();
}
