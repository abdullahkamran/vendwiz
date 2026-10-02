/**
 * Unit tests for the hooks.server.ts utilities.
 *
 * Tests cover:
 *   - extractPathSlug: pure function, no mocking needed
 *   - subdomainHook: path-based fallback branch — mocks db and auth
 *
 * These tests would fail against the pre-change code because neither
 * extractPathSlug nor the path-based fallback existed before.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock handles (must be created before vi.mock factories run) ────────

const { mockFindFirst } = vi.hoisted(() => ({
	mockFindFirst: vi.fn()
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('$lib/server/auth/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn().mockResolvedValue(null)
		},
		handler: vi.fn().mockResolvedValue(new Response())
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			stores: {
				findFirst: mockFindFirst
			}
		}
	}
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────

import { extractPathSlug, subdomainHook } from './hooks.server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal RequestEvent-shaped object for subdomainHook. */
function makeEvent(
	host: string,
	pathname: string
): {
	request: { headers: { get: (h: string) => string | null } };
	url: { pathname: string };
	locals: {
		isStorefront: boolean;
		store: unknown;
		subdomain: string | null;
		session: null;
		user: null;
	};
} {
	return {
		request: {
			headers: {
				get: (header: string) => (header === 'host' ? host : null)
			}
		},
		url: { pathname },
		locals: {
			isStorefront: false,
			store: null,
			subdomain: null,
			session: null,
			user: null
		}
	};
}

const resolve = vi.fn().mockResolvedValue(new Response());

// ── extractPathSlug ───────────────────────────────────────────────────────────

describe('extractPathSlug', () => {
	it('returns the slug from /store/<slug>', () => {
		expect(extractPathSlug('/store/mystore')).toBe('mystore');
	});

	it('returns the slug from /store/<slug>/products', () => {
		expect(extractPathSlug('/store/mystore/products')).toBe('mystore');
	});

	it('returns the slug from /store/<slug>/cart/checkout', () => {
		expect(extractPathSlug('/store/mystore/cart/checkout')).toBe('mystore');
	});

	it('returns null for paths that do not start with /store/', () => {
		expect(extractPathSlug('/products')).toBeNull();
	});

	it('returns null for /', () => {
		expect(extractPathSlug('/')).toBeNull();
	});

	it('returns null for /storefront/x (not /store/)', () => {
		expect(extractPathSlug('/storefront/x')).toBeNull();
	});
});

// ── subdomainHook — path-based fallback ───────────────────────────────────────

describe('subdomainHook — path-based /store/[slug] fallback', () => {
	const mockStore = {
		id: 'store-1',
		subdomain: 'mystore',
		isActive: true,
		name: 'My Store'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		resolve.mockResolvedValue(new Response());
	});

	it('sets isStorefront=true when the store is found via path slug', async () => {
		mockFindFirst.mockResolvedValue(mockStore);

		const event = makeEvent('192.168.1.100:5173', '/store/mystore');
		await subdomainHook({ event: event as Parameters<typeof subdomainHook>[0]['event'], resolve });

		expect(event.locals.isStorefront).toBe(true);
		expect(event.locals.subdomain).toBe('mystore');
		expect(event.locals.store).toBe(mockStore);
	});

	it('sets isStorefront=false when no store matches the slug', async () => {
		mockFindFirst.mockResolvedValue(undefined);

		const event = makeEvent('192.168.1.100:5173', '/store/unknownslug');
		await subdomainHook({ event: event as Parameters<typeof subdomainHook>[0]['event'], resolve });

		expect(event.locals.isStorefront).toBe(false);
		expect(event.locals.subdomain).toBe('unknownslug');
		expect(event.locals.store).toBeNull();
	});

	it('does not run path-based lookup when isStorefront was already set via subdomain', async () => {
		// Simulate a subdomain request: host = mystore.localhost
		// The subdomain branch fires first and sets isStorefront=true.
		// We call subdomainHook directly, which resets isStorefront to false internally
		// before the subdomain check, so we test the expected path.
		// The important thing: when a valid subdomain is detected, the path-based
		// branch is skipped (it is guarded by !event.locals.isStorefront).
		mockFindFirst.mockResolvedValue(mockStore);

		const event = makeEvent('mystore.localhost:5173', '/');
		await subdomainHook({ event: event as Parameters<typeof subdomainHook>[0]['event'], resolve });

		// The subdomain branch ran (mystore.localhost); isStorefront should be true.
		expect(event.locals.isStorefront).toBe(true);
		// findFirst was called exactly once (by the subdomain branch, not the path branch).
		expect(mockFindFirst).toHaveBeenCalledTimes(1);
	});

	it('calls resolve and returns its result', async () => {
		mockFindFirst.mockResolvedValue(mockStore);
		const fakeResponse = new Response('ok');
		resolve.mockResolvedValue(fakeResponse);

		const event = makeEvent('localhost', '/store/mystore');
		const result = await subdomainHook({
			event: event as Parameters<typeof subdomainHook>[0]['event'],
			resolve
		});

		expect(resolve).toHaveBeenCalledWith(event);
		expect(result).toBe(fakeResponse);
	});
});
