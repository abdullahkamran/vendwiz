import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, discountCodes, orders } from '$lib/server/db/schema';
import { getDefaultDiscount } from '$lib/server/defaults';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user!.id)
	});

	const discounts = await db.query.discountCodes.findMany({
		where: and(eq(discountCodes.storeId, store!.id), eq(discountCodes.isDefault, false)),
		orderBy: (d, { desc }) => [desc(d.createdAt)]
	});

	return { store: store!, discounts };
};

export const actions: Actions = {
	deleteDiscount: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Missing discount ID' });
		}

		const store = await db.query.stores.findFirst({
			where: eq(stores.ownerId, locals.user!.id)
		});

		if (!store) {
			return fail(404, { error: 'Store not found' });
		}

		// Past orders that used this code reference it by id, and the database refuses to delete a
		// referenced row. Re-point those orders at the store's hidden default discount code, then
		// delete — all in one transaction.
		try {
			await db.transaction(async (tx) => {
				const [code] = await tx
					.select({ id: discountCodes.id, isDefault: discountCodes.isDefault })
					.from(discountCodes)
					.where(and(eq(discountCodes.id, id), eq(discountCodes.storeId, store.id)))
					.limit(1);
				if (!code || code.isDefault) return;

				const fallback = await getDefaultDiscount(store.id, tx);
				await tx.update(orders).set({ discountCodeId: fallback.id }).where(eq(orders.discountCodeId, code.id));
				await tx
					.delete(discountCodes)
					.where(and(eq(discountCodes.id, code.id), eq(discountCodes.storeId, store.id)));
			});
		} catch (err) {
			console.error('deleteDiscount failed', err);
			return fail(500, { error: 'Could not delete this discount code. Please try again.' });
		}

		return { success: true };
	},

	toggleDiscount: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const isActive = data.get('isActive') === 'true';

		if (!id) {
			return fail(400, { error: 'Missing discount ID' });
		}

		const store = await db.query.stores.findFirst({
			where: eq(stores.ownerId, locals.user!.id)
		});

		if (!store) {
			return fail(404, { error: 'Store not found' });
		}

		await db
			.update(discountCodes)
			.set({ isActive: !isActive })
			.where(and(eq(discountCodes.id, id), eq(discountCodes.storeId, store.id)));

		return { success: true };
	}
};
