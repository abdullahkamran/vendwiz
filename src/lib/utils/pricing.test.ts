import { describe, it, expect } from 'vitest';
import { saleDiscount, applySale } from './pricing';

describe('saleDiscount', () => {
	it('is the amount taken off the base price', () => {
		expect(saleDiscount('100.00', '80.00')).toBe(20);
		expect(saleDiscount(100, 99.5)).toBeCloseTo(0.5);
	});
	it('is 0 without a sale or with an invalid one', () => {
		expect(saleDiscount('100', null)).toBe(0);
		expect(saleDiscount('100', undefined)).toBe(0);
		expect(saleDiscount('100', '')).toBe(0);
		expect(saleDiscount('100', '100')).toBe(0);
		expect(saleDiscount('100', '120')).toBe(0);
	});
});

describe('applySale', () => {
	it('keeps a variant modifier: sale takes the same amount off', () => {
		// base 100 on sale at 80 (20 off); a variant at base + 30 = 130 pays 110
		expect(applySale(130, saleDiscount(100, 80))).toBe(110);
	});
	it('never goes below zero', () => {
		expect(applySale(10, 50)).toBe(0);
	});
});
