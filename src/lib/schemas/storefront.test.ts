import { describe, it, expect } from 'vitest';
import { checkoutSchema } from './storefront';
import { isPaymentMethod, paymentLabel, DEFAULT_PAYMENT_METHOD } from '../paymentInfo';

const base = {
	customerName: 'Ali Khan',
	customerPhone: '+923001234567',
	shippingAddress: '12 Main Street, Lahore',
	items: [{ productId: 'p', title: 't', slug: 's', price: 1, quantity: 1 }]
};

describe('checkout payment method', () => {
	it('defaults to cash on delivery when not sent', () => {
		const r = checkoutSchema.parse(base);
		expect(r.paymentMethod).toBe('cod');
		expect(DEFAULT_PAYMENT_METHOD).toBe('cod');
	});
	it('accepts bank transfer', () => {
		expect(checkoutSchema.parse({ ...base, paymentMethod: 'bank_transfer' }).paymentMethod).toBe('bank_transfer');
	});
	it('rejects any other method (no online payment)', () => {
		expect(checkoutSchema.safeParse({ ...base, paymentMethod: 'card' }).success).toBe(false);
	});
	it('labels methods for display, treating unknown/legacy values as cash on delivery', () => {
		expect(paymentLabel('bank_transfer')).toBe('Bank Transfer');
		expect(paymentLabel('cod')).toBe('Cash on Delivery');
		expect(paymentLabel(undefined)).toBe('Cash on Delivery');
		expect(isPaymentMethod('cod')).toBe(true);
		expect(isPaymentMethod('x')).toBe(false);
	});
});
