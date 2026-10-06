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

	it('/store/mystore/api/admin/products → undefined (API admin paths blocked)', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/api/admin/products'))).toBeUndefined();
	});

	it('/store/mystore/api/admin → undefined (exact /api/admin blocked)', () => {
		expect(reroute(makeEvent('http://localhost/store/mystore/api/admin'))).toBeUndefined();
	});

	// Storefront API paths must be rerouted so the server hook can resolve
	// locals.store from the slug in the original URL (bug fix: was blocked by
	// the bare '/api' entry that has been narrowed to '/api/admin').
	it('/store/mystore/api/storefront/checkout → /api/storefront/checkout (storefront API rerouted)', () => {
		expect(
			reroute(makeEvent('http://localhost/store/mystore/api/storefront/checkout'))
		).toBe('/api/storefront/checkout');
	});

	// Non-/store URLs bypass the regex entirely — basePath is '' on subdomain
	// access and the reroute hook must not interfere.
	it('/api/storefront/checkout → undefined (not a /store path, regex short-circuits)', () => {
		expect(reroute(makeEvent('http://localhost/api/storefront/checkout'))).toBeUndefined();
	});
});
