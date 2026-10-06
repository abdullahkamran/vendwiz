/**
 * Tests for the storefront checkout API route (POST /api/storefront/checkout).
 *
 * The key tests — "taxAmount is computed on the post-discount subtotal" and
 * "total reflects the new calculation" — FAIL against the pre-fix code where:
 *
 *   Pre-fix:
 *     taxAmount = subtotal * taxRate              (ignores discount)
 *     total     = subtotal + shipping + tax - discount
 *
 *   Post-fix:
 *     taxAmount = (subtotal - discountAmount) * taxRate   ← tax on net subtotal
 *     total     = (subtotal - discountAmount) + taxAmount + shipping
 *
 * Scenario: product costs 1000, 10% percentage discount → discountAmount 100.
 *   Pre-fix:  taxAmount=100 (10% of 1000), total=1000
 *   Post-fix: taxAmount=90  (10% of 900),  total=990
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('nanoid', () => ({
	nanoid: vi.fn().mockReturnValue('testid12345678')
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { db } from '$lib/server/db';
import { POST } from './+server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a chainable, awaitable mock for db.select() chains.
 * Handles both `.where()` and `.limit()` as the final awaited step.
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
	return obj;
}

/** Build a minimal insert chain whose `values` spy captures arguments. */
function makeInsertChain() {
	return { values: vi.fn().mockResolvedValue(undefined) };
}

/** Build a minimal update chain (no-op). */
function makeUpdateChain() {
	return {
		set: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined)
		})
	};
}

/** Create a minimal Request with a JSON body. */
function makeRequest(body: unknown): Request {
	return { json: () => Promise.resolve(body) } as unknown as Request;
}

/** Store with 10% tax, no shipping, no free threshold. */
const mockStore = {
	id: 'store-1',
	shippingFee: '0',
	freeShippingThreshold: null,
	taxRate: '0.1',
	currencySymbol: '$',
	whatsapp: null
};

/** Minimal checkout payload referencing product p1. */
const checkoutWithDiscount = {
	customerName: 'Jane Doe',
	customerPhone: '0300-0000000',
	customerEmail: 'jane@example.com',
	shippingAddress: '1 Example Street, Example City, Country',
	discountCode: 'SAVE10',
	items: [
		{
			productId: 'p1',
			title: 'Widget',
			slug: 'widget',
			price: 9999, // client-supplied price — server ignores this, uses DB price
			quantity: 1
		}
	]
};

/** Same payload without a discount code. */
const checkoutNoDiscount = {
	customerName: 'Jane Doe',
	customerPhone: '0300-0000000',
	customerEmail: 'jane@example.com',
	shippingAddress: '1 Example Street, Example City, Country',
	items: checkoutWithDiscount.items
};

// ── Tests — with percentage discount ─────────────────────────────────────────

describe('checkout POST — tax on post-discount subtotal (percentage discount)', () => {
	let orderInsertSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		// DB products: one product priced at PKR 1000, in stock
		const productRows = [
			{ id: 'p1', basePrice: '1000', salePrice: null, stockQty: 10, isPublished: true }
		];
		// DB discount code: SAVE10 → 10% percentage off
		const discountRows = [
			{
				id: 'dc1',
				type: 'percentage',
				value: '10',
				usageLimit: null,
				usageCount: 0,
				expiresAt: null
			}
		];

		vi.mocked(db.select)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeSelectChain(productRows) as any)
			// Variant query is skipped (no variantSelections in items)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeSelectChain(discountRows) as any);

		// Capture the values passed to db.insert(orders)
		orderInsertSpy = vi.fn().mockResolvedValue(undefined);
		vi.mocked(db.insert)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce({ values: orderInsertSpy } as any)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeInsertChain() as any); // orderItems

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);
	});

	it('stores taxAmount as tax on the post-discount subtotal', async () => {
		// subtotal=1000, discountAmount=100 (10%), taxAmount should be 90 (10% × 900)
		// Pre-fix: taxAmount = 1000 × 0.1 = 100  → '100.00' → test FAILS
		// Post-fix: taxAmount = 900 × 0.1 = 90   → '90.00'  → test PASSES
		await POST({
			request: makeRequest(checkoutWithDiscount),
			locals: { isStorefront: true, store: mockStore }
		} as Parameters<typeof POST>[0]);

		const insertedOrder = orderInsertSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(insertedOrder.taxAmount).toBe('90.00');
	});

	it('stores total as (subtotal - discount) + tax + shipping', async () => {
		// (1000 - 100) + 90 + 0 = 990
		// Pre-fix: total = 1000 + 0 + 100 - 100 = 1000 → '1000.00' → test FAILS
		// Post-fix: total = 990 → '990.00' → test PASSES
		await POST({
			request: makeRequest(checkoutWithDiscount),
			locals: { isStorefront: true, store: mockStore }
		} as Parameters<typeof POST>[0]);

		const insertedOrder = orderInsertSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(insertedOrder.total).toBe('990.00');
	});

	it('stores discountAmount as 10% of the subtotal', async () => {
		await POST({
			request: makeRequest(checkoutWithDiscount),
			locals: { isStorefront: true, store: mockStore }
		} as Parameters<typeof POST>[0]);

		const insertedOrder = orderInsertSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(insertedOrder.discountAmount).toBe('100.00');
	});

	it('returns 200 with an orderRef', async () => {
		const response = await POST({
			request: makeRequest(checkoutWithDiscount),
			locals: { isStorefront: true, store: mockStore }
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('orderRef');
	});
});

// ── Tests — without discount (regression guard) ───────────────────────────────

describe('checkout POST — tax on full subtotal when no discount', () => {
	let orderInsertSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		const productRows = [
			{ id: 'p1', basePrice: '1000', salePrice: null, stockQty: 10, isPublished: true }
		];

		// Only one select call (no discount query when discountCode is absent)
		vi.mocked(db.select).mockReturnValueOnce(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			makeSelectChain(productRows) as any
		);

		orderInsertSpy = vi.fn().mockResolvedValue(undefined);
		vi.mocked(db.insert)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce({ values: orderInsertSpy } as any)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockReturnValueOnce(makeInsertChain() as any);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);
	});

	it('applies tax to the full subtotal when no discount code is used', async () => {
		// subtotal=1000, no discount → taxAmount = 1000 × 0.1 = 100
		await POST({
			request: makeRequest(checkoutNoDiscount),
			locals: { isStorefront: true, store: mockStore }
		} as Parameters<typeof POST>[0]);

		const insertedOrder = orderInsertSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(insertedOrder.taxAmount).toBe('100.00');
		expect(insertedOrder.total).toBe('1100.00'); // 1000 + 100
		expect(insertedOrder.discountAmount).toBe('0.00');
	});
});

// ── Tests — error guards ──────────────────────────────────────────────────────

describe('checkout POST — error responses', () => {
	it('returns 404 when isStorefront is false', async () => {
		await expect(
			POST({
				request: makeRequest(checkoutWithDiscount),
				locals: { isStorefront: false, store: null }
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns 422 when request body is invalid JSON', async () => {
		const badRequest = {
			json: () => Promise.reject(new SyntaxError('bad json'))
		} as unknown as Request;

		await expect(
			POST({
				request: badRequest,
				locals: { isStorefront: true, store: mockStore }
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 400 });
	});
});
