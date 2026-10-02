/**
 * Tests that the stores and products schema tables expose the SEO-relevant
 * columns that the SEO utility (src/lib/seo.ts) reads at runtime.
 *
 * These tests fail before the SEO feature is in place because they import
 * buildSeo from src/lib/seo.ts, which does not exist in the pre-feature code.
 */
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { stores, products } from './schema';
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
