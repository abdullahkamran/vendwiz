import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, discountCodes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user!.id)
	});

	const discounts = await db.query.discountCodes.findMany({
		where: eq(discountCodes.storeId, store!.id),
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

		await db
			.delete(discountCodes)
			.where(and(eq(discountCodes.id, id), eq(discountCodes.storeId, store.id)));

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
