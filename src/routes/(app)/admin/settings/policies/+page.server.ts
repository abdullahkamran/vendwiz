import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, storePolicies } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user!.id)
	});

	const policies = await db.query.storePolicies.findMany({
		where: eq(storePolicies.storeId, store!.id)
	});

	return { store: store!, policies };
};

export const actions: Actions = {
	savePolicy: async ({ request, locals }) => {
		const data = await request.formData();

		const type = data.get('type') as string;
		const title = (data.get('title') as string)?.trim();
		const content = (data.get('content') as string)?.trim() ?? '';

		const validTypes = ['return_refund', 'shipping', 'terms', 'faq'];
		if (!validTypes.includes(type)) {
			return fail(400, { error: 'Invalid policy type', type });
		}

		if (!title) {
			return fail(400, { error: 'Title is required', type });
		}

		const store = await db.query.stores.findFirst({
			where: eq(stores.ownerId, locals.user!.id)
		});

		if (!store) {
			return fail(404, { error: 'Store not found', type });
		}

		// Upsert: check if policy exists
		const existing = await db.query.storePolicies.findFirst({
			where: and(eq(storePolicies.storeId, store.id), eq(storePolicies.type, type))
		});

		if (existing) {
			await db
				.update(storePolicies)
				.set({ title, content, updatedAt: new Date() })
				.where(and(eq(storePolicies.storeId, store.id), eq(storePolicies.type, type)));
		} else {
			await db.insert(storePolicies).values({
				id: nanoid(),
				storeId: store.id,
				type,
				title,
				content,
				updatedAt: new Date()
			});
		}

		return { success: true, savedType: type };
	}
};
