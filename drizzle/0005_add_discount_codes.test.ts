import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('migration 0005_add_discount_codes', () => {
	const sql = readFileSync(
		resolve(process.cwd(), 'drizzle/0005_add_discount_codes.sql'),
		'utf-8'
	);

	it('creates the discount_type enum', () => {
		expect(sql).toContain("CREATE TYPE \"discount_type\" AS ENUM ('percentage', 'fixed')");
	});

	it('creates the discount_codes table with IF NOT EXISTS', () => {
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "discount_codes"');
	});

	it('includes store_id foreign key referencing stores', () => {
		expect(sql).toContain('"store_id"');
		expect(sql).toContain('REFERENCES "stores"("id")');
	});

	it('includes the type column using the discount_type enum', () => {
		expect(sql).toContain('"type"');
		expect(sql).toContain('"discount_type"');
	});

	it('includes the value column as numeric', () => {
		expect(sql).toContain('"value"');
		expect(sql).toContain('numeric(10, 2)');
	});
});
