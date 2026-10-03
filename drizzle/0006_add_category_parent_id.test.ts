import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('migration 0006_add_category_parent_id', () => {
	const sql = readFileSync(
		resolve(process.cwd(), 'drizzle/0006_add_category_parent_id.sql'),
		'utf-8'
	);

	it('adds parent_id column to categories with IF NOT EXISTS', () => {
		expect(sql).toContain('ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id"');
	});

	it('sets text type with self-referential FK to categories.id', () => {
		expect(sql).toContain('text REFERENCES "categories"("id")');
	});

	it('sets ON DELETE SET NULL so deleting a parent does not cascade to children', () => {
		expect(sql).toContain('ON DELETE SET NULL');
	});
});
