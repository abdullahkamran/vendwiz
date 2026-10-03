/**
 * Unit tests for the storefront layout server load function.
 *
 * Key behaviours tested:
 *   - basePath is derived from the URL when accessed via /store/[slug]/...
 *   - basePath is empty string for normal subdomain access
 *   - A redirect to /login is thrown when isStorefront is false (non-storefront host)
 *   - A 404 is thrown for path-based /store/<slug> access when the store row is missing
 *
 * These tests would fail against the pre-change code because basePath was not
 * returned and the load function did not accept a url parameter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────

import { db } from '$lib/server/db';
import { load } from './+layout.server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a chainable drizzle-style query builder that resolves with result. */
function makeChain(result: unknown[]) {
	const chain = {
		from: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn().mockResolvedValue(result),
		limit: vi.fn().mockResolvedValue(result)
	};
	chain.from.mockReturnValue(chain);
	chain.where.mockReturnValue(chain);
	return chain;
}

/** Convenience: set up db.select to return two empty chains (categories + promo). */
function mockEmptyDb() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	vi.mocked(db.select).mockReturnValueOnce(makeChain([]) as any).mockReturnValueOnce(makeChain([]) as any);
}

const mockStore = {
	id: 'store-1',
	subdomain: 'mystore',
	isActive: true,
	name: 'My Store',
	ownerId: 'user-1',
	description: null,
	logoUrl: null,
	faviconUrl: null,
	seoTitle: null,
	seoDescription: null,
	theme: 'basic',
	customTheme: null,
	announcementEnabled: false,
	announcementText: null,
	whatsapp: null,
	instagram: null,
	facebook: null,
	contactEmail: null,
	currencySymbol: 'PKR',
	createdAt: new Date(),
	updatedAt: new Date()
};

function makeLocals(isStorefront: boolean, store: unknown) {
	return {
		isStorefront,
		store,
		session: null,
		user: null,
		subdomain: isStorefront ? 'mystore' : null
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('load — basePath derivation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEmptyDb();
	});

	it('derives /store/mystore basePath from a path-based URL', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await load({
			locals: makeLocals(true, mockStore),
			url: new URL('http://192.168.1.1/store/mystore/products')
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result.basePath).toBe('/store/mystore');
	});

	it('returns empty basePath for a normal subdomain URL', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await load({
			locals: makeLocals(true, mockStore),
			url: new URL('http://mystore.vendwiz.com/products')
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result.basePath).toBe('');
	});

	it('returns empty basePath for localhost subdomain URL', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await load({
			locals: makeLocals(true, mockStore),
			url: new URL('http://mystore.localhost:5173/')
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result.basePath).toBe('');
	});
});

describe('load — redirect guard', () => {
	it('throws a redirect to /login when isStorefront is false', async () => {
		await expect(
			load({
				locals: makeLocals(false, null),
				url: new URL('http://localhost/login')
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('throws a 404 when store is null but URL is path-based /store/ access', async () => {
		await expect(
			load({
				locals: makeLocals(true, null),
				url: new URL('http://localhost/store/mystore')
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 404, body: { message: 'Store not found' } });
	});
});

describe('load — data shape', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEmptyDb();
	});

	it('returns store, categories, promoCode, and basePath together', async () => {
		const result = (await load({
			locals: makeLocals(true, mockStore),
			url: new URL('http://mystore.localhost:5173/')
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result).toHaveProperty('store');
		expect(result).toHaveProperty('categories');
		expect(result).toHaveProperty('promoCode');
		expect(result).toHaveProperty('basePath');
		expect(typeof result.basePath).toBe('string');
	});
});
