/**
 * Tests for PUT /api/admin/orders/[id]/status
 *
 * Covers the stock-restore logic added for cancellations:
 * - cancelling restores product stock
 * - cancelling restores variant stock when a variantId is present
 * - non-cancellation transitions leave stock untouched
 * - items whose productId is null (deleted products) are silently skipped
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mutable state shared with mock factories ───────────────────────────────
// Object reference is stable across hoisting; properties are updated per-test.
const ctx = {
	orderRow: null as Record<string, unknown> | null,
	itemRows: [] as Array<{ productId: string | null; variantId: string | null; quantity: number }>,
	selectCallCount: 0,
	updateCallCount: 0,
	setCalls: [] as Array<Record<string, unknown>>
};

// ── Drizzle-orm helpers — return plain tokens; exact values not asserted ───
vi.mock('drizzle-orm', () => ({
	eq: (_a: unknown, _b: unknown) => `eq`,
	and: (..._args: unknown[]) => `and`,
	sql: (strings: TemplateStringsArray, ...vals: unknown[]) => ({ __sql: true, strings, vals })
}));

// ── Schema — plain objects with column stubs ───────────────────────────────
vi.mock('$lib/server/db/schema', () => ({
	orders: { id: 'orders.id', storeId: 'orders.storeId', status: 'orders.status' },
	orderItems: {
		orderId: 'orderItems.orderId',
		productId: 'orderItems.productId',
		variantId: 'orderItems.variantId',
		quantity: 'orderItems.quantity'
	},
	products: { id: 'products.id', stockQty: 'products.stockQty' },
	productVariants: { id: 'productVariants.id', stockQty: 'productVariants.stockQty' }
}));

// ── DB mock — chainable builders backed by ctx state ──────────────────────
vi.mock('$lib/server/db', () => {
	// Build a thenable chain that resolves to `rows`.
	function makeSelectChain(rows: unknown[]) {
		const p = Promise.resolve(rows);
		const chain: Record<string, unknown> = {};
		chain.from = () => chain;
		chain.where = () => chain;
		chain.limit = () => chain;
		// Supports both explicit .then(cb) and implicit `await chain`
		chain.then = (
			onf?: (v: unknown) => unknown,
			onr?: (e: unknown) => unknown
		) => p.then(onf, onr);
		chain.catch = (onr: (e: unknown) => unknown) => p.catch(onr);
		chain.finally = (onf: () => void) => p.finally(onf);
		return chain;
	}

	function makeUpdateChain() {
		ctx.updateCallCount++;
		const p = Promise.resolve(undefined);
		const chain: Record<string, unknown> = {};
		chain.set = (data: Record<string, unknown>) => {
			ctx.setCalls.push(data);
			return chain;
		};
		chain.where = () => chain;
		// .returning() used only by the order-status update
		chain.returning = () => Promise.resolve([ctx.orderRow ?? {}]);
		// Direct `await db.update(...).set(...).where(...)` used for stock updates
		chain.then = p.then.bind(p);
		chain.catch = p.catch.bind(p);
		chain.finally = p.finally.bind(p);
		return chain;
	}

	return {
		db: {
			select: () => {
				// First call → order lookup; second call → order items lookup
				const idx = ctx.selectCallCount++;
				const rows = idx === 0
					? (ctx.orderRow ? [ctx.orderRow] : [])
					: ctx.itemRows;
				return makeSelectChain(rows);
			},
			update: () => makeUpdateChain()
		}
	};
});

import { PUT } from './+server';

// ── Fake SvelteKit event ───────────────────────────────────────────────────
function makeEvent(status: string, orderId = 'order-1') {
	return {
		params: { id: orderId },
		request: { json: () => Promise.resolve({ status }) },
		locals: {
			user: { id: 'user-1' },
			store: { id: 'store-1' }
		}
	} as unknown as Parameters<typeof PUT>[0];
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PUT /api/admin/orders/[id]/status — stock restore', () => {
	beforeEach(() => {
		ctx.selectCallCount = 0;
		ctx.updateCallCount = 0;
		ctx.setCalls = [];
		ctx.orderRow = { id: 'order-1', storeId: 'store-1', status: 'pending' };
		ctx.itemRows = [];
	});

	it('cancelling restores product stock (no variant)', async () => {
		ctx.itemRows = [{ productId: 'prod-1', variantId: null, quantity: 3 }];

		await PUT(makeEvent('cancelled'));

		// order update + product stock update
		expect(ctx.updateCallCount).toBe(2);
		// Second set call is the product stock increment
		expect(ctx.setCalls[1]).toHaveProperty('stockQty');
	});

	it('cancelling restores both product and variant stock', async () => {
		ctx.itemRows = [{ productId: 'prod-1', variantId: 'var-1', quantity: 2 }];

		await PUT(makeEvent('cancelled'));

		// order update + product stock update + variant stock update
		expect(ctx.updateCallCount).toBe(3);
		expect(ctx.setCalls[1]).toHaveProperty('stockQty');
		expect(ctx.setCalls[2]).toHaveProperty('stockQty');
	});

	it('non-cancellation status change does NOT touch stock', async () => {
		ctx.itemRows = [{ productId: 'prod-1', variantId: null, quantity: 3 }];

		await PUT(makeEvent('processing'));

		// Only the order status update; no stock updates
		expect(ctx.updateCallCount).toBe(1);
		expect(ctx.setCalls).toHaveLength(1);
		expect(ctx.setCalls[0]).not.toHaveProperty('stockQty');
	});

	it('silently skips items whose productId is null (deleted products)', async () => {
		ctx.itemRows = [
			{ productId: null, variantId: null, quantity: 5 },
			{ productId: 'prod-2', variantId: null, quantity: 1 }
		];

		await PUT(makeEvent('cancelled'));

		// order update + 1 live product (null-productId row skipped)
		expect(ctx.updateCallCount).toBe(2);
	});
});
