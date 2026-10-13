/**
 * Tests for POST /api/storefront/checkout
 *
 * Covers the confirmation-email behaviour added for optional customerEmail:
 * - sendEmail is NOT called when customerEmail is absent or empty
 * - sendEmail IS called with subject "Order confirmed – #<orderNumber>" when
 *   customerEmail is provided
 *
 * These tests fail on the old code because:
 *   1. The old Zod schema required customerEmail, so the no-email request
 *      would return 422 instead of 200.
 *   2. The old handler never called sendEmail at all, so the with-email
 *      assertion that sendEmail was invoked would also fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mutable state shared with mock factories ───────────────────────────────
const ctx = {
	sendEmailArgs: [] as Array<{ to: string; subject: string; html: string }>
};

// ── drizzle-orm helpers ────────────────────────────────────────────────────
vi.mock('drizzle-orm', () => ({
	eq: (_a: unknown, _b: unknown) => 'eq',
	and: (..._args: unknown[]) => 'and',
	inArray: (_a: unknown, _b: unknown) => 'inArray',
	sql: (strings: TemplateStringsArray, ...vals: unknown[]) => ({ strings, vals })
}));

// ── Schema stubs ───────────────────────────────────────────────────────────
vi.mock('$lib/server/db/schema', () => ({
	orders: { id: 'orders.id', storeId: 'orders.storeId' },
	orderItems: { orderId: 'orderItems.orderId' },
	discountCodes: {
		storeId: 'discountCodes.storeId',
		code: 'discountCodes.code',
		isActive: 'discountCodes.isActive'
	},
	products: {
		id: 'products.id',
		storeId: 'products.storeId',
		stockQty: 'products.stockQty'
	},
	productVariants: {
		id: 'productVariants.id',
		productId: 'productVariants.productId',
		stockQty: 'productVariants.stockQty'
	}
}));

// ── nanoid — predictable values ────────────────────────────────────────────
vi.mock('nanoid', () => ({
	nanoid: (n?: number) => (n === 8 ? 'ABCD1234' : 'mock-id')
}));

// ── DB mock ────────────────────────────────────────────────────────────────
vi.mock('$lib/server/db', () => {
	function makeSelectChain(rows: unknown[]) {
		const p = Promise.resolve(rows);
		const c: Record<string, unknown> = {};
		c.from = () => c;
		c.where = () => c;
		c.limit = () => c;
		c.then = (
			onf?: (v: unknown) => unknown,
			onr?: (e: unknown) => unknown
		) => p.then(onf, onr);
		c.catch = (onr: (e: unknown) => unknown) => p.catch(onr);
		c.finally = (onf: () => void) => p.finally(onf);
		return c;
	}
	function makeInsertChain() {
		const c: Record<string, unknown> = {};
		c.values = () => Promise.resolve([]);
		return c;
	}
	function makeUpdateChain() {
		const c: Record<string, unknown> = {};
		c.set = () => c;
		c.where = () => Promise.resolve([]);
		return c;
	}
	return {
		db: {
			select: () => {
				// Always return the product row; the handler may call select multiple times
				// (e.g. for product lookup or future discount-code lookup) and must always
				// be able to resolve the product.
				const rows = [
					{ id: 'prod-1', basePrice: '100', salePrice: null, stockQty: 10, isPublished: true }
				];
				return makeSelectChain(rows);
			},
			insert: () => makeInsertChain(),
			update: () => makeUpdateChain()
		}
	};
});

// ── Email mock — captured for assertion ───────────────────────────────────
vi.mock('$lib/server/email', () => ({
	sendEmail: vi.fn(async (args: { to: string; subject: string; html: string }) => {
		ctx.sendEmailArgs.push(args);
	})
}));

// Import sendEmail after mock registration so we get the spy reference
import { sendEmail } from '$lib/server/email';
import { POST } from './+server';

// ── Helpers ────────────────────────────────────────────────────────────────
const BASE_STORE = {
	id: 'store-1',
	shippingFee: '0',
	freeShippingThreshold: null,
	taxRate: '0',
	currencySymbol: 'Rs.',
	whatsapp: null,
	name: 'Test Store'
};

const BASE_ITEMS = [
	{
		productId: 'prod-1',
		title: 'Widget',
		slug: 'widget',
		price: 100,
		quantity: 1
	}
];

function makeEvent(body: unknown) {
	return {
		request: { json: () => Promise.resolve(body) },
		locals: { isStorefront: true, store: BASE_STORE }
	} as unknown as Parameters<typeof POST>[0];
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/storefront/checkout — confirmation email', () => {
	beforeEach(() => {
		ctx.sendEmailArgs = [];
		vi.mocked(sendEmail).mockClear();
	});

	it('returns 200 and does NOT call sendEmail when customerEmail is absent', async () => {
		const res = await POST(
			makeEvent({
				customerName: 'Alice',
				customerPhone: '1234567890',
				shippingAddress: '123 Main Street, Cityville',
				// customerEmail intentionally omitted
				items: BASE_ITEMS
			})
		);

		expect(res.status).toBe(200);
		// Allow the fire-and-forget promise to settle
		await new Promise((r) => setTimeout(r, 10));
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('returns 200 and does NOT call sendEmail when customerEmail is empty string', async () => {
		const res = await POST(
			makeEvent({
				customerName: 'Alice',
				customerPhone: '1234567890',
				shippingAddress: '123 Main Street, Cityville',
				customerEmail: '',
				items: BASE_ITEMS
			})
		);

		expect(res.status).toBe(200);
		await new Promise((r) => setTimeout(r, 10));
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('returns 200 and calls sendEmail with subject matching "Order confirmed" when customerEmail is provided', async () => {
		const res = await POST(
			makeEvent({
				customerName: 'Bob',
				customerPhone: '0987654321',
				shippingAddress: '456 Elm Street, Townsville',
				customerEmail: 'bob@example.com',
				items: BASE_ITEMS
			})
		);

		expect(res.status).toBe(200);
		// Allow the fire-and-forget promise to settle
		await new Promise((r) => setTimeout(r, 10));

		expect(sendEmail).toHaveBeenCalledOnce();
		const call = vi.mocked(sendEmail).mock.calls[0][0];
		expect(call.to).toBe('bob@example.com');
		expect(call.subject).toMatch(/Order confirmed/);
		// Subject must include the generated order number
		expect(call.subject).toMatch(/ORD-ABCD1234/);
	});
});
