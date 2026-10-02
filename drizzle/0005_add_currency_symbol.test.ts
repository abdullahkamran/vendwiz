import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('migration 0005_add_currency_symbol', () => {
	const sql = readFileSync(
		resolve(process.cwd(), 'drizzle/0005_add_currency_symbol.sql'),
		'utf-8'
	);

	it('adds currency_symbol column to stores with IF NOT EXISTS', () => {
		expect(sql).toContain('ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "currency_symbol"');
	});

	it('sets text type and NOT NULL DEFAULT Rs.', () => {
		expect(sql).toContain("text NOT NULL DEFAULT 'Rs.'");
	});
});
