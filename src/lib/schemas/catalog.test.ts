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

import { categorySchema } from './catalog';

describe('categorySchema image', () => {
	const base = { name: 'Plates', slug: 'plates' };
	it('accepts an https link, an uploaded image path, or no image', () => {
		expect(categorySchema.safeParse({ ...base, imageUrl: 'https://example.com/a.jpg' }).success).toBe(true);
		expect(categorySchema.safeParse({ ...base, imageUrl: '/uploads/AbC_123-x.webp' }).success).toBe(true);
		expect(categorySchema.safeParse({ ...base, imageUrl: null }).success).toBe(true);
		expect(categorySchema.safeParse(base).success).toBe(true);
	});
	it('rejects anything else, including script links and paths outside /uploads', () => {
		for (const bad of ['javascript:alert(1)', 'ftp://x/y.png', '/etc/passwd', 'not a link', '/uploads/../secret']) {
			expect(categorySchema.safeParse({ ...base, imageUrl: bad }).success, bad).toBe(false);
		}
	});
});
