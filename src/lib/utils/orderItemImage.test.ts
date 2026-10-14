import { describe, it, expect } from 'vitest';
import { pickItemImage } from './orderItemImage';

const products = [{ id: 'p1', images: [{ url: '/b.webp', order: 1 }, { url: '/a.webp', order: 0 }] }];
const options = [
	{ productId: 'p1', label: 'Red', value: '#ff0000', imageUrl: '/red.webp' },
	{ productId: 'p1', label: 'Blue', value: '#0000ff', imageUrl: null }
];

describe('pickItemImage', () => {
	it("uses the chosen option's image when it has one", () => {
		expect(pickItemImage({ productId: 'p1', variantLabel: 'Red' }, products, options)).toBe('/red.webp');
		expect(pickItemImage({ productId: 'p1', variantLabel: 'Red / Small' }, products, options)).toBe('/red.webp');
	});
	it("falls back to the product's first image (by order)", () => {
		expect(pickItemImage({ productId: 'p1', variantLabel: 'Blue' }, products, options)).toBe('/a.webp');
		expect(pickItemImage({ productId: 'p1', variantLabel: null }, products, options)).toBe('/a.webp');
	});
	it('is null when there is nothing to show', () => {
		expect(pickItemImage({ productId: null, variantLabel: null }, products, options)).toBeNull();
		expect(pickItemImage({ productId: 'gone', variantLabel: null }, products, options)).toBeNull();
		expect(pickItemImage({ productId: 'p1', variantLabel: null }, [{ id: 'p1', images: [] }], [])).toBeNull();
	});
});
