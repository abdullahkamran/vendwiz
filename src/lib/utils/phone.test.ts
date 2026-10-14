import { describe, it, expect } from 'vitest';
import { composePhone, nationalDigits, whatsappDigits } from './phone';
import { checkoutSchema } from '../schemas/storefront';
import { COUNTRIES, defaultCountryIso } from '../countries';

describe('composePhone', () => {
	it('joins the dial code and the number, dropping the local leading 0 and formatting', () => {
		expect(composePhone('92', '0300 1234567')).toBe('+923001234567');
		expect(composePhone('44', '(07911) 123456')).toBe('+447911123456');
	});
	it('is empty when nothing was typed (so "required" is reported, not "invalid")', () => {
		expect(composePhone('92', '')).toBe('');
		expect(composePhone('92', ' - ')).toBe('');
		expect(nationalDigits('000')).toBe('');
	});
});

describe('whatsappDigits', () => {
	it('returns digits only for wa.me', () => {
		expect(whatsappDigits('+92 300-1234567')).toBe('923001234567');
		expect(whatsappDigits('0092 3001234567')).toBe('923001234567');
	});
});

describe('checkout phone rule', () => {
	const base = { customerName: 'Ali Khan', shippingAddress: '12 Main Street, Lahore', items: [{ productId: 'p', title: 't', slug: 's', price: 1, quantity: 1 }] };
	it('accepts an international number and rejects one without a + country code', () => {
		expect(checkoutSchema.safeParse({ ...base, customerPhone: '+923001234567' }).success).toBe(true);
		const bad = checkoutSchema.safeParse({ ...base, customerPhone: '03001234567' });
		expect(bad.success).toBe(false);
		expect(bad.success ? '' : bad.error.issues[0].message).toMatch(/valid phone number/);
	});
});

describe('countries', () => {
	it('has unique iso codes and a currency-based default', () => {
		expect(new Set(COUNTRIES.map((c) => c.iso)).size).toBe(COUNTRIES.length);
		expect(defaultCountryIso('GBP')).toBe('GB');
		expect(defaultCountryIso('XYZ')).toBe('PK');
	});
});
