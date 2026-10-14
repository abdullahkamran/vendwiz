import { describe, it, expect } from 'vitest';
import { validateProductForm, isValidSizeChartUrl, type ProductFormInput } from './productFormValidation';

const ok: ProductFormInput = {
	title: 'Mug', slug: 'mug', basePrice: 10, youtubeUrl: '', stockQty: 0, lowStockThreshold: 5,
	seoTitle: '', seoDescription: '', variants: [{ name: 'Size' }], attributes: [{ name: 'Material', value: 'Clay' }]
};

describe('validateProductForm', () => {
	it('accepts a valid form', () => {
		expect(validateProductForm(ok).valid).toBe(true);
	});
	it('flags blank title, bad slug and bad price on the basic tab', () => {
		const r = validateProductForm({ ...ok, title: ' ', slug: 'Bad Slug', basePrice: null });
		expect(Object.keys(r.fields).sort()).toEqual(['basePrice', 'slug', 'title']);
		expect([...r.tabs]).toEqual(['basic']);
	});
	it('flags an unnamed variant (the reported bug)', () => {
		const r = validateProductForm({ ...ok, variants: [{ name: 'Size' }, { name: '' }] });
		expect(r.tabs.has('variants')).toBe(true);
	});
	it('flags attribute rows missing a name or value', () => {
		expect(validateProductForm({ ...ok, attributes: [{ name: 'A', value: '' }] }).tabs.has('attributes')).toBe(true);
	});
	it('flags over-long SEO fields and bad inventory numbers', () => {
		const r = validateProductForm({ ...ok, seoTitle: 'x'.repeat(61), stockQty: -1 });
		expect(r.tabs.has('seo')).toBe(true);
		expect(r.tabs.has('inventory')).toBe(true);
	});
	it('validates optional youtube url only when filled', () => {
		expect(validateProductForm({ ...ok, youtubeUrl: 'nope' }).fields.youtubeUrl).toBeTruthy();
		expect(validateProductForm({ ...ok, youtubeUrl: 'https://youtu.be/x' }).valid).toBe(true);
	});
});

describe('isValidSizeChartUrl', () => {
	it('allows empty and https, rejects http and junk', () => {
		expect(isValidSizeChartUrl('')).toBe(true);
		expect(isValidSizeChartUrl('https://a.com/x.jpg')).toBe(true);
		expect(isValidSizeChartUrl('http://a.com/x.jpg')).toBe(false);
		expect(isValidSizeChartUrl('abc')).toBe(false);
	});
});

describe('sale price validation', () => {
	it('is optional', () => {
		expect(validateProductForm({ ...ok, salePrice: null }).valid).toBe(true);
		expect(validateProductForm({ ...ok }).valid).toBe(true);
	});
	it('must be lower than the base price', () => {
		expect(validateProductForm({ ...ok, salePrice: 8 }).valid).toBe(true);
		const r = validateProductForm({ ...ok, salePrice: 10 });
		expect(r.fields.salePrice).toMatch(/lower than the regular price/);
		expect(r.tabs.has('basic')).toBe(true);
		expect(validateProductForm({ ...ok, salePrice: 15 }).valid).toBe(false);
	});
	it('rejects a negative sale price', () => {
		expect(validateProductForm({ ...ok, salePrice: -1 }).fields.salePrice).toBeTruthy();
	});
});
