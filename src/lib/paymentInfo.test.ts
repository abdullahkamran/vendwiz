import { describe, it, expect } from 'vitest';
import { hasBankDetails, bankDetailRows, availablePaymentMethods } from './paymentInfo';

const full = { bankName: 'HBL', bankAccountTitle: 'Little Clay House', bankAccountNumber: '0123-456', bankIban: '', bankBranch: null };

describe('per-store bank details', () => {
	it('needs bank name, account title and account number', () => {
		expect(hasBankDetails(full)).toBe(true);
		expect(hasBankDetails({ ...full, bankAccountNumber: '  ' })).toBe(false);
		expect(hasBankDetails({})).toBe(false);
	});
	it('lists only the filled-in details, in order', () => {
		expect(bankDetailRows({ ...full, bankIban: 'PK36 XXXX', bankBranch: ' Main ' }).map((r) => r.label)).toEqual([
			'Bank',
			'Account title',
			'Account number',
			'IBAN',
			'Branch'
		]);
		expect(bankDetailRows(full).map((r) => r.label)).toEqual(['Bank', 'Account title', 'Account number']);
	});
	it('offers bank transfer only to stores that set it up; cash on delivery is always there', () => {
		expect(availablePaymentMethods({}).map((m) => m.id)).toEqual(['cod']);
		expect(availablePaymentMethods(full).map((m) => m.id)).toEqual(['cod', 'bank_transfer']);
	});
});
