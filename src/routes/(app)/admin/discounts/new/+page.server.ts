import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, discountCodes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();

		const code = (data.get('code') as string)?.trim().toUpperCase();
		const type = data.get('type') as 'percentage' | 'fixed';
		const valueStr = data.get('value') as string;
		const minOrderStr = data.get('minOrderAmount') as string;
		const usageLimitStr = data.get('usageLimit') as string;
		const isActive = data.get('isActive') === 'on';
		const expiresAtStr = data.get('expiresAt') as string;

		// Validation
		if (!code || !/^[A-Z0-9-]{3,20}$/.test(code)) {
			return fail(400, { error: 'Code must be 3–20 uppercase alphanumeric characters or hyphens' });
		}

		if (!['percentage', 'fixed'].includes(type)) {
			return fail(400, { error: 'Invalid discount type' });
		}

		const value = parseFloat(valueStr);
		if (isNaN(value) || value <= 0) {
			return fail(400, { error: 'Value must be greater than 0' });
		}
		if (type === 'percentage' && (value < 1 || value > 100)) {
			return fail(400, { error: 'Percentage must be between 1 and 100' });
		}

		const minOrderAmount = minOrderStr ? parseFloat(minOrderStr) : null;
		const usageLimit = usageLimitStr ? parseInt(usageLimitStr, 10) : null;

		let expiresAt: Date | null = null;
		if (expiresAtStr) {
			expiresAt = new Date(expiresAtStr);
			if (expiresAt <= new Date()) {
				return fail(400, { error: 'Expiry date must be in the future' });
			}
		}

		const store = await db.query.stores.findFirst({
			where: eq(stores.ownerId, locals.user!.id)
		});

		if (!store) {
			return fail(404, { error: 'Store not found' });
		}

		// Check for duplicate code
		const existing = await db.query.discountCodes.findFirst({
			where: and(eq(discountCodes.storeId, store.id), eq(discountCodes.code, code))
		});

		if (existing) {
			return fail(400, { error: `A discount code "${code}" already exists` });
		}

		await db.insert(discountCodes).values({
			id: nanoid(),
			storeId: store.id,
			code,
			type,
			value: value.toFixed(2),
			minOrderAmount: minOrderAmount !== null ? minOrderAmount.toFixed(2) : null,
			usageLimit,
			usageCount: 0,
			isActive,
			expiresAt,
			createdAt: new Date()
		});

		throw redirect(302, '/admin/discounts');
	}
};
