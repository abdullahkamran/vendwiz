import { describe, it, expect } from 'vitest';
import { sumFirstGroupStock, combinedStockFromData } from './stock';

describe('sumFirstGroupStock (admin form / API payload)', () => {
	it('is null without variants', () => {
		expect(sumFirstGroupStock([])).toBeNull();
		expect(sumFirstGroupStock([{ options: [] }])).toBeNull();
	});
	it('sums the options of the first variant group', () => {
		expect(sumFirstGroupStock([{ options: [{ stockQty: 5 }, { stockQty: 3 }, {}] }])).toBe(8);
	});
	it('does not double count a second group (Color + Size describe the same units)', () => {
		expect(
			sumFirstGroupStock([{ options: [{ stockQty: 5 }, { stockQty: 3 }] }, { options: [{ stockQty: 4 }, { stockQty: 4 }] }])
		).toBe(8);
	});
	it('ignores negative values', () => {
		expect(sumFirstGroupStock([{ options: [{ stockQty: -2 }, { stockQty: 3 }] }])).toBe(3);
	});
});

describe('combinedStockFromData (stored data)', () => {
	const groups = [
		{ id: 'g-color', sortOrder: 0, values: [{ id: 'red' }, { id: 'blue' }] },
		{ id: 'g-size', sortOrder: 1, values: [{ id: 's' }, { id: 'm' }] }
	];
	const variants = [
		{ optionValueIds: ['red'], stockQty: 2 },
		{ optionValueIds: ['blue'], stockQty: 0 },
		{ optionValueIds: ['s'], stockQty: 9 },
		{ optionValueIds: ['m'], stockQty: 9 }
	];
	it('is null when there are no variants', () => {
		expect(combinedStockFromData(groups, [])).toBeNull();
	});
	it('sums the first group only', () => {
		expect(combinedStockFromData(groups, variants)).toBe(2);
	});
	it('is 0 when every option is sold out (product shows Out of Stock)', () => {
		expect(combinedStockFromData(groups, variants.map((v) => ({ ...v, stockQty: 0 })))).toBe(0);
	});
	it('sums all legacy flat variants when there are no option groups', () => {
		expect(combinedStockFromData([], [{ optionValueIds: [], stockQty: 1 }, { optionValueIds: [], stockQty: 4 }])).toBe(5);
	});
});
