import { describe, it, expect, vi, beforeEach } from 'vitest';

// Rows returned by the two selects in findStockIssues: 1st = products, 2nd = variants
const rows = { products: [] as unknown[], variants: [] as unknown[] };
let call = 0;

vi.mock('drizzle-orm', () => ({
	eq: () => 'eq',
	and: () => 'and',
	inArray: () => 'inArray'
}));
vi.mock('$lib/server/db/schema', () => ({
	products: { id: 'p.id', storeId: 'p.storeId', title: 'p.title', stockQty: 'p.stockQty', isPublished: 'p.isPublished' },
	productVariants: { id: 'v.id', productId: 'v.productId', label: 'v.label', stockQty: 'v.stockQty' }
}));
vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => Promise.resolve(call++ % 2 === 0 ? rows.products : rows.variants)
			})
		})
	}
}));

import { findStockIssues } from './cartStock';

const product = (over = {}) => ({ id: 'p1', title: 'Mug', stockQty: 5, isPublished: true, ...over });

beforeEach(() => {
	call = 0;
	rows.products = [product()];
	rows.variants = [];
});

describe('findStockIssues', () => {
	it('returns nothing when the cart fits within stock', async () => {
		expect(await findStockIssues('s', [{ productId: 'p1', quantity: 5 }])).toEqual([]);
	});

	it('flags a plain product ordered above its stock', async () => {
		const [issue] = await findStockIssues('s', [{ productId: 'p1', quantity: 6 }]);
		expect(issue.available).toBe(5);
		expect(issue.message).not.toMatch(/\d/);
	});

	it('says "out of stock" when nothing is left', async () => {
		rows.products = [product({ stockQty: 0 })];
		const [issue] = await findStockIssues('s', [{ productId: 'p1', quantity: 1 }]);
		expect(issue.message).toBe('Mug is out of stock');
	});

	it('checks the selected option\'s own stock, not the product stock', async () => {
		rows.variants = [{ id: 'v1', productId: 'p1', label: 'Red', stockQty: 2 }];
		const sel = { Color: 'Red' };
		expect(await findStockIssues('s', [{ productId: 'p1', quantity: 2, variantSelections: sel }])).toEqual([]);
		const [issue] = await findStockIssues('s', [{ productId: 'p1', quantity: 3, variantSelections: sel }]);
		expect(issue.available).toBe(2);
		expect(issue.message).toContain('Color: Red');
	});

	it('counts several lines drawing on the same option together', async () => {
		rows.variants = [{ id: 'v1', productId: 'p1', label: 'Red', stockQty: 3 }];
		const issues = await findStockIssues('s', [
			{ productId: 'p1', quantity: 2, variantSelections: { Color: 'Red', Size: 'S' } },
			{ productId: 'p1', quantity: 2, variantSelections: { Color: 'Red', Size: 'M' } }
		]);
		expect(issues).toHaveLength(2);
	});

	it('flags unpublished or missing products', async () => {
		rows.products = [product({ isPublished: false })];
		expect((await findStockIssues('s', [{ productId: 'p1', quantity: 1 }]))[0].message).toContain('no longer available');
		rows.products = [];
		call = 0;
		expect((await findStockIssues('s', [{ productId: 'p1', quantity: 1 }]))[0].available).toBe(0);
	});
});
