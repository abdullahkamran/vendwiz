/**
 * Payment options shown at checkout.
 *
 * Cash on delivery is always available. Bank transfer is offered only when the store owner has
 * entered their bank details in Settings → Payments, so every store shows its own account.
 */

export type PaymentMethod = 'cod' | 'bank_transfer';

export const PAYMENT_METHODS: ReadonlyArray<{ id: PaymentMethod; label: string; description: string }> = [
	{ id: 'cod', label: 'Cash on Delivery', description: 'Pay in cash when your order arrives.' },
	{ id: 'bank_transfer', label: 'Bank Transfer', description: 'Transfer the amount to our bank account.' }
];

/** Cash on delivery is preselected; customers can switch to bank transfer when it's offered. */
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cod';

/** The bank fields stored on a store (all optional in the database). */
export type BankFields = {
	bankName?: string | null;
	bankAccountTitle?: string | null;
	bankAccountNumber?: string | null;
	bankIban?: string | null;
	bankBranch?: string | null;
};

const clean = (v: string | null | undefined) => (v ?? '').trim();

/** Bank name, account title and account number are the minimum needed to accept a transfer. */
export function hasBankDetails(store: BankFields): boolean {
	return !!clean(store.bankName) && !!clean(store.bankAccountTitle) && !!clean(store.bankAccountNumber);
}

/** The filled-in bank details as label/value rows, in display order. */
export function bankDetailRows(store: BankFields): Array<{ label: string; value: string }> {
	return [
		{ label: 'Bank', value: clean(store.bankName) },
		{ label: 'Account title', value: clean(store.bankAccountTitle) },
		{ label: 'Account number', value: clean(store.bankAccountNumber) },
		{ label: 'IBAN', value: clean(store.bankIban) },
		{ label: 'Branch', value: clean(store.bankBranch) }
	].filter((row) => row.value !== '');
}

/** Payment methods this store offers right now. */
export function availablePaymentMethods(store: BankFields) {
	return PAYMENT_METHODS.filter((m) => m.id === 'cod' || hasBankDetails(store));
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
	return value === 'cod' || value === 'bank_transfer';
}

export function paymentLabel(value: string | null | undefined): string {
	return PAYMENT_METHODS.find((m) => m.id === value)?.label ?? 'Cash on Delivery';
}
