import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { reviews, products } from '$lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const status = url.searchParams.get('status') ?? 'all';
	const conditions = [eq(reviews.storeId, store.id)];

	if (status === 'approved') conditions.push(eq(reviews.isApproved, true));
	else if (status === 'pending') conditions.push(eq(reviews.isApproved, false));

	const results = await db
		.select({
			id: reviews.id,
			productId: reviews.productId,
			storeId: reviews.storeId,
			customerName: reviews.customerName,
			rating: reviews.rating,
			text: reviews.text,
			isApproved: reviews.isApproved,
			createdAt: reviews.createdAt,
			productTitle: products.title
		})
		.from(reviews)
		.leftJoin(products, eq(reviews.productId, products.id))
		.where(and(...conditions))
		.orderBy(desc(reviews.createdAt));

	return { reviews: results, status };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = fd.get('id') as string;

		await db
			.update(reviews)
			.set({ isApproved: true })
			.where(and(eq(reviews.id, id), eq(reviews.storeId, store.id)));

		return { success: true };
	},

	hide: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = fd.get('id') as string;

		await db
			.update(reviews)
			.set({ isApproved: false })
			.where(and(eq(reviews.id, id), eq(reviews.storeId, store.id)));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = fd.get('id') as string;

		await db
			.delete(reviews)
			.where(and(eq(reviews.id, id), eq(reviews.storeId, store.id)));

		return { success: true };
	},

	approveAll: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const ids = fd.getAll('ids') as string[];

		for (const id of ids) {
			await db
				.update(reviews)
				.set({ isApproved: true })
				.where(and(eq(reviews.id, id), eq(reviews.storeId, store.id)));
		}

		return { success: true };
	},

	deleteAll: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const ids = fd.getAll('ids') as string[];

		for (const id of ids) {
			await db
				.delete(reviews)
				.where(and(eq(reviews.id, id), eq(reviews.storeId, store.id)));
		}

		return { success: true };
	}
};
