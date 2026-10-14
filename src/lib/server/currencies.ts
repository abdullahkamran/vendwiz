import { db } from '$lib/server/db';
import { currencies } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const DEFAULT_CURRENCIES = [
	{ code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', sortOrder: 1 },
	{ code: 'USD', symbol: '$', name: 'US Dollar', sortOrder: 2 },
	{ code: 'EUR', symbol: '€', name: 'Euro', sortOrder: 3 },
	{ code: 'GBP', symbol: '£', name: 'British Pound', sortOrder: 4 },
	{ code: 'INR', symbol: '₹', name: 'Indian Rupee', sortOrder: 5 },
	{ code: 'AED', symbol: 'AED', name: 'UAE Dirham', sortOrder: 6 },
	{ code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', sortOrder: 7 },
	{ code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', sortOrder: 8 },
	{ code: 'AUD', symbol: 'A$', name: 'Australian Dollar', sortOrder: 9 },
	{ code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', sortOrder: 10 }
] as const;

/** Seeds the supported currencies if missing (idempotent), then returns them in display order. */
export async function listCurrencies() {
	await db.insert(currencies).values([...DEFAULT_CURRENCIES]).onConflictDoNothing();
	return db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.code));
}

export async function findCurrency(code: string) {
	await listCurrencies();
	return db.query.currencies.findFirst({ where: eq(currencies.code, code) });
}
