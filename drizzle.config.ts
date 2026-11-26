import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env' });

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		// Direct (non-pooled) connection: drizzle-kit needs session features the pooler lacks.
		url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)!
	}
});
