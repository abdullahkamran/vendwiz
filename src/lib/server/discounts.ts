import { eq, and, gt, isNull, or } from 'drizzle-orm';
import { discountCodes } from './db/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './db/schema';
import { sql } from 'drizzle-orm';

type DB = PostgresJsDatabase<typeof schema>;

export interface ApplyDiscountResult {
	valid: boolean;
	amount?: number;
	discountCodeId?: string;
	error?: string;
}

/**
 * Look up a discount code and calculate the discount amount.
 * Does NOT increment usageCount — that happens on order creation.
 */
export async function applyDiscount(
	code: string,
	storeId: string,
	subtotal: number,
	db: DB
): Promise<ApplyDiscountResult> {
	const upperCode = code.toUpperCase().trim();

	const discount = await db.query.discountCodes.findFirst({
		where: and(
			eq(discountCodes.storeId, storeId),
			eq(discountCodes.code, upperCode),
			eq(discountCodes.isActive, true)
		)
	});

	if (!discount) {
		return { valid: false, error: 'Invalid or inactive discount code' };
	}

	// Check expiry
	if (discount.expiresAt && discount.expiresAt < new Date()) {
		return { valid: false, error: 'This discount code has expired' };
	}

	// Check usage limit
	if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
		return { valid: false, error: 'This discount code has reached its usage limit' };
	}

	// Check min order amount
	const minOrder = discount.minOrderAmount ? parseFloat(discount.minOrderAmount) : 0;
	if (subtotal < minOrder) {
		return {
			valid: false,
			error: `Minimum order amount of ${minOrder.toFixed(2)} required for this discount`
		};
	}

	// Calculate discount amount
	const value = parseFloat(discount.value);
	let amount = 0;

	if (discount.type === 'percentage') {
		amount = (subtotal * value) / 100;
	} else {
		amount = Math.min(value, subtotal);
	}

	return {
		valid: true,
		amount: Math.round(amount * 100) / 100,
		discountCodeId: discount.id
	};
}

/**
 * Atomically increment the usage count of a discount code.
 */
export async function incrementDiscountUsage(discountCodeId: string, db: DB): Promise<void> {
	await db
		.update(discountCodes)
		.set({ usageCount: sql`${discountCodes.usageCount} + 1` })
		.where(eq(discountCodes.id, discountCodeId));
}
