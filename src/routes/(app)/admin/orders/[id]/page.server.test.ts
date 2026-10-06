/**
 * Tests for the admin order-detail page server load function.
 *
 * The key test — "load returns store in the loaded data" — FAILS against the
 * pre-fix code because the old load() returned:
 *   { order, items, allowedNext, waUrl, storeWhatsapp }
 * The template now reads `data.store.currencySymbol` on every price line, so
 * `store` must be included in the return value.  The fix adds it:
 *   return { order, items, allowedNext, waUrl, storeWhatsapp: store.whatsapp, store };
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

vi.mock('$lib/utils/whatsapp', () => ({
	buildWhatsAppUrl: vi.fn().mockReturnValue('https://wa.me/test')
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { db } from '$lib/server/db';
import { load } from './+page.server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a chainable, awaitable mock for Drizzle select() chains.
 *
 * Every chaining method (from/where/limit/orderBy) returns the same object so
 * `await db.select().from(t).where(...)` and
 * `await db.select().from(t).where(...).limit(1).then(r => r[0])` both work.
 */
function makeSelectChain(result: unknown[]) {
	const obj: Record<string, unknown> = {
		then: (
			resolve: (v: unknown) => unknown,
			reject?: (e: unknown) => unknown
		) => Promise.resolve(result).then(resolve, reject)
	};
	obj.from = vi.fn().mockReturnValue(obj);
	obj.where = vi.fn().mockReturnValue(obj);
	obj.limit = vi.fn().mockReturnValue(obj);
	obj.orderBy = vi.fn().mockReturnValue(obj);
	return obj;
}

const mockOrder = {
	id: 'order-1',
	storeId: 'store-1',
	orderNumber: 'ORD-TEST001',
	status: 'pending',
	customerName: 'Test Customer',
	customerPhone: '0300-0000000',
	customerEmail: 'test@example.com',
	shippingAddress: '1 Test St, City',
	subtotal: '1000.00',
	shippingFee: '0.00',
	taxAmount: '0.00',
	discountAmount: '0.00',
	discountCodeId: null,
	total: '1000.00',
	notes: null,
	createdAt: new Date(),
	updatedAt: new Date()
};

const mockStore = {
	id: 'store-1',
	name: 'Test Store',
	currencySymbol: '$',
	whatsapp: null
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('admin order detail — load returns store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// First call: orders query; second call: orderItems query
		vi.mocked(db.select)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeSelectChain([mockOrder]) as any)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeSelectChain([]) as any);
	});

	it('includes store in the returned data object', async () => {
		// This is the key discriminating assertion.
		// Pre-fix: load() returns { order, items, allowedNext, waUrl, storeWhatsapp }
		//          → result.store is undefined → test FAILS
		// Post-fix: load() returns { ..., store }
		//          → result.store equals mockStore → test PASSES
		const result = (await load({
			params: { id: 'order-1' },
			locals: { user: { id: 'user-1' }, store: mockStore }
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result).toHaveProperty('store');
		expect(result['store']).toEqual(mockStore);
	});

	it('returns all expected fields alongside store', async () => {
		const result = (await load({
			params: { id: 'order-1' },
			locals: { user: { id: 'user-1' }, store: mockStore }
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect(result).toHaveProperty('order');
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('allowedNext');
		expect(result).toHaveProperty('waUrl');
		expect(result).toHaveProperty('storeWhatsapp');
		expect(result).toHaveProperty('store'); // new field absent in pre-fix code
	});

	it('exposes the currencySymbol through store', async () => {
		const result = (await load({
			params: { id: 'order-1' },
			locals: { user: { id: 'user-1' }, store: mockStore }
		} as Parameters<typeof load>[0])) as Record<string, unknown>;

		expect((result['store'] as typeof mockStore).currencySymbol).toBe('$');
	});
});

describe('admin order detail — load guards', () => {
	it('throws 401 when user is not authenticated', async () => {
		await expect(
			load({
				params: { id: 'order-1' },
				locals: { user: null, store: mockStore }
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 401 });
	});

	it('throws 400 when store context is missing', async () => {
		await expect(
			load({
				params: { id: 'order-1' },
				locals: { user: { id: 'user-1' }, store: null }
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 404 when the order does not belong to the store', async () => {
		vi.clearAllMocks();
		vi.mocked(db.select).mockReturnValueOnce(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			makeSelectChain([]) as any
		);

		await expect(
			load({
				params: { id: 'nonexistent-order' },
				locals: { user: { id: 'user-1' }, store: mockStore }
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 404 });
	});
});
