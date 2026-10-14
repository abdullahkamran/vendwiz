import { describe, it, expect } from 'vitest';
import { variantSchema } from './catalog';

describe('variantSchema option images', () => {
	it('keeps a per-option imageUrl (so it reaches the DB insert)', () => {
		const parsed = variantSchema.parse({
			name: 'Color',
			options: [{ label: 'Red', price_modifier: 0, stockQty: 2, colorHex: '#ff0000', imageUrl: '/uploads/products/red.webp' }]
		});
		expect(parsed.options[0].imageUrl).toBe('/uploads/products/red.webp');
	});
	it('accepts an empty or missing imageUrl', () => {
		expect(variantSchema.parse({ name: 'Size', options: [{ label: 'M', price_modifier: 0, imageUrl: '' }] }).options[0].imageUrl).toBe('');
		expect(variantSchema.parse({ name: 'Size', options: [{ label: 'M', price_modifier: 0 }] }).options[0].imageUrl).toBeUndefined();
	});
});
