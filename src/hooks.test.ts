/**
 * Unit tests for the reroute hook (src/hooks.ts).
 *
 * These tests verify that /store/[slug]/... paths are remapped to the
 * equivalent storefront route, and that unrelated paths are left untouched.
 * They would fail against a build without the reroute hook because the
 * function would not be exported.
 */
import { describe, it, expect } from 'vitest';
import { reroute } from './hooks';

/** Minimal reroute event — only url is used by our hook; cast remainder. */
function makeEvent(href: string): Parameters<typeof reroute>[0] {
	return { url: new URL(href), fetch: globalThis.fetch } as Parameters<typeof reroute>[0];
}

describe('reroute', () => {
	it('/store/mystore → /', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore'))).toBe('/');
	});

	it('/store/mystore/products → /products', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/products'))).toBe('/products');
	});

	it('/store/mystore/cart → /cart', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/cart'))).toBe('/cart');
	});

	it('/store/mystore/products/some-slug → /products/some-slug', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/products/some-slug'))).toBe(
			'/products/some-slug'
		);
	});

	it('/other/path → undefined (not a store path)', () => {
		expect(reroute(makeEvent('http://localhost/other/path'))).toBeUndefined();
	});

	it('/ → undefined (root is not a store path)', () => {
		expect(reroute(makeEvent('http://localhost/'))).toBeUndefined();
	});

	// Security: admin and API paths must never be rerouted.
	// If they were, subdomainHook would inject a foreign store into locals
	// while the real admin/API handler runs — a cross-tenant IDOR.
	it('/store/mystore/admin/dashboard → undefined (admin paths blocked)', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/admin/dashboard'))).toBeUndefined();
	});

	it('/store/mystore/admin → undefined (exact /admin blocked)', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/admin'))).toBeUndefined();
	});

	it('/store/mystore/api/admin/products → undefined (API paths blocked)', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/api/admin/products'))).toBeUndefined();
	});

	it('/store/mystore/api/storefront/checkout → undefined (storefront API paths also blocked)', () => {
		expect(
			reroute(makeEvent('http://localhost/store/mystore/api/storefront/checkout'))
		).toBeUndefined();
	});
});
