/**
 * Tests that the stores and products schema tables expose the SEO-relevant
 * columns that the SEO utility (src/lib/seo.ts) reads at runtime.
 *
 * These tests fail before the SEO feature is in place because they import
 * buildSeo from src/lib/seo.ts, which does not exist in the pre-feature code.
 */
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { stores, products, categories, storePolicies, POLICY_TYPES, discountCodes, productVariants } from './schema';
import { buildSeo } from '../../seo';

// ─── Schema structure ─────────────────────────────────────────────────────────

describe('stores schema — SEO columns', () => {
	it('exposes seoTitle', () => {
		const cols = getTableColumns(stores);
		expect(cols).toHaveProperty('seoTitle');
	});

	it('exposes seoDescription', () => {
		const cols = getTableColumns(stores);
		expect(cols).toHaveProperty('seoDescription');
	});

	it('exposes logoUrl (og:image fallback)', () => {
		const cols = getTableColumns(stores);
		expect(cols).toHaveProperty('logoUrl');
	});

	it('exposes faviconUrl (secondary og:image fallback)', () => {
		const cols = getTableColumns(stores);
		expect(cols).toHaveProperty('faviconUrl');
	});
});

describe('products schema — SEO columns', () => {
	it('exposes seoTitle', () => {
		const cols = getTableColumns(products);
		expect(cols).toHaveProperty('seoTitle');
	});

	it('exposes seoDescription', () => {
		const cols = getTableColumns(products);
		expect(cols).toHaveProperty('seoDescription');
	});

	it('exposes images (product gallery used for og:image)', () => {
		const cols = getTableColumns(products);
		expect(cols).toHaveProperty('images');
	});

	it('exposes slug (used in canonical URLs and JSON-LD)', () => {
		const cols = getTableColumns(products);
		expect(cols).toHaveProperty('slug');
	});
});

// ─── currencySymbol column ────────────────────────────────────────────────────

describe('stores schema — currencySymbol column', () => {
	it('exposes currencySymbol', () => {
		const cols = getTableColumns(stores);
		expect(cols).toHaveProperty('currencySymbol');
	});

	it('currencySymbol column name maps to currency_symbol', () => {
		const cols = getTableColumns(stores);
		expect((cols.currencySymbol as { name: string }).name).toBe('currency_symbol');
	});
});

// ─── discountCodes schema ─────────────────────────────────────────────────────

describe('discountCodes schema — required columns for the create/update actions', () => {
	it('exports discountCodes table', () => {
		expect(discountCodes).toBeDefined();
	});

	it('has id column', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('id');
	});

	it('has storeId column mapping to store_id', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('storeId');
		expect((cols.storeId as { name: string }).name).toBe('store_id');
	});

	it('has code column', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('code');
	});

	it('has type column (discount_type enum)', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('type');
	});

	it('has value column', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('value');
	});

	it('has isActive column mapping to is_active', () => {
		const cols = getTableColumns(discountCodes);
		expect(cols).toHaveProperty('isActive');
		expect((cols.isActive as { name: string }).name).toBe('is_active');
	});
});

// ─── storePolicies schema ─────────────────────────────────────────────────────

describe('storePolicies schema — structure', () => {
	it('exposes all required columns', () => {
		const cols = getTableColumns(storePolicies);
		expect(cols).toHaveProperty('id');
		expect(cols).toHaveProperty('storeId');
		expect(cols).toHaveProperty('type');
		expect(cols).toHaveProperty('title');
		expect(cols).toHaveProperty('content');
		expect(cols).toHaveProperty('updatedAt');
	});

	it('storeId column maps to store_id', () => {
		const cols = getTableColumns(storePolicies);
		expect((cols.storeId as { name: string }).name).toBe('store_id');
	});

	it('updatedAt column maps to updated_at', () => {
		const cols = getTableColumns(storePolicies);
		expect((cols.updatedAt as { name: string }).name).toBe('updated_at');
	});
});

// ─── POLICY_TYPES canonical values ────────────────────────────────────────────

describe('POLICY_TYPES', () => {
	it('exports POLICY_TYPES as a readonly tuple', () => {
		expect(Array.isArray(POLICY_TYPES)).toBe(true);
	});

	it('includes return_refund as the canonical return-policy type', () => {
		// The storefront URL uses /policies/return but the DB stores return_refund.
		// This test fails on code that does not export POLICY_TYPES, and confirms
		// the canonical value is present so TYPE_ALIAS maps to it correctly.
		expect(POLICY_TYPES).toContain('return_refund');
	});

	it('includes all four policy types', () => {
		expect(POLICY_TYPES).toContain('shipping');
		expect(POLICY_TYPES).toContain('terms');
		expect(POLICY_TYPES).toContain('faq');
		expect(POLICY_TYPES).toHaveLength(4);
	});

	it('does not include the URL slug "return" (that is the storefront alias)', () => {
		// The DB value is return_refund; /policies/return is the URL slug.
		expect(POLICY_TYPES).not.toContain('return');
	});
});

// ─── productVariants schema — sizeChartUrl column ─────────────────────────────

describe('productVariants schema — sizeChartUrl column', () => {
	it('exposes sizeChartUrl', () => {
		const cols = getTableColumns(productVariants);
		expect(cols).toHaveProperty('sizeChartUrl');
	});

	it('sizeChartUrl maps to the size_chart_url DB column name', () => {
		const cols = getTableColumns(productVariants);
		expect((cols.sizeChartUrl as { name: string }).name).toBe('size_chart_url');
	});

	it('sizeChartUrl is nullable (no notNull constraint)', () => {
		const cols = getTableColumns(productVariants);
		expect((cols.sizeChartUrl as { notNull: boolean }).notNull).toBe(false);
	});
});

// ─── categories schema — parentId column ─────────────────────────────────────

describe('categories schema — parentId column', () => {
	it('exposes parentId', () => {
		const cols = getTableColumns(categories);
		expect(cols).toHaveProperty('parentId');
	});

	it('parentId maps to the parent_id DB column name', () => {
		const cols = getTableColumns(categories);
		expect((cols.parentId as { name: string }).name).toBe('parent_id');
	});

	it('parentId is nullable (no notNull constraint)', () => {
		const cols = getTableColumns(categories);
		expect((cols.parentId as { notNull: boolean }).notNull).toBe(false);
	});
});

// ─── buildSeo integration with schema-shaped store objects ───────────────────

describe('buildSeo — uses schema-aligned store fields', () => {
	// Mirrors the shape that +layout.server.ts returns from db.select(stores)
	const storeRow = {
		name: 'Test Store',
		description: 'A great store',
		seoTitle: 'SEO Title Override',
		seoDescription: 'SEO meta description',
		logoUrl: 'https://cdn.example.com/logo.png',
		faviconUrl: null
	};

	const url = new URL('http://test.localhost:5000/');

	it('prefers seoTitle over name for og:title', () => {
		const tags = buildSeo({ url, store: storeRow });
		expect(tags.ogTitle).toBe('SEO Title Override');
	});

	it('prefers seoDescription over description for meta description', () => {
		const tags = buildSeo({ url, store: storeRow });
		expect(tags.description).toBe('SEO meta description');
	});

	it('uses logoUrl as og:image fallback when no page image is provided', () => {
		const tags = buildSeo({ url, store: storeRow });
		expect(tags.ogImage).toBe('https://cdn.example.com/logo.png');
	});

	it('builds an absolute canonical URL from the request URL', () => {
		const productUrl = new URL('http://test.localhost:5000/products/blue-shirt');
		const tags = buildSeo({ url: productUrl, store: storeRow });
		expect(tags.canonical).toBe('http://test.localhost:5000/products/blue-shirt');
	});
});
