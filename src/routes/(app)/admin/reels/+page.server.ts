import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { productReels, products } from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { parseVideoSource } from '$lib/utils/video';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const [reels, productOptions] = await Promise.all([
		db
			.select({
				id: productReels.id,
				productId: productReels.productId,
				videoUrl: productReels.videoUrl,
				caption: productReels.caption,
				isPublished: productReels.isPublished,
				sortOrder: productReels.sortOrder,
				createdAt: productReels.createdAt,
				productTitle: products.title
			})
			.from(productReels)
			.leftJoin(products, eq(productReels.productId, products.id))
			.where(eq(productReels.storeId, store.id))
			.orderBy(asc(productReels.sortOrder), desc(productReels.createdAt)),
		db
			.select({ id: products.id, title: products.title })
			.from(products)
			.where(and(eq(products.storeId, store.id), eq(products.isDefault, false)))
			.orderBy(asc(products.title))
	]);

	return { reels, products: productOptions };
};

/** Validate the shared create/update fields; returns either the clean values or a fail(). */
async function readReelForm(fd: FormData, storeId: string) {
	const productId = String(fd.get('productId') ?? '').trim();
	const videoUrl = String(fd.get('videoUrl') ?? '').trim();
	const caption = String(fd.get('caption') ?? '').trim().slice(0, 300) || null;
	const isPublished = fd.get('isPublished') === 'on';
	const sortOrder = Number.parseInt(String(fd.get('sortOrder') ?? '0'), 10) || 0;

	if (!productId) return { error: fail(400, { error: 'Choose a product for this reel.' }) };
	if (!parseVideoSource(videoUrl)) {
		return {
			error: fail(400, {
				error:
					'Enter a YouTube or YouTube Shorts link.'
			})
		};
	}

	// The product must belong to this store
	const [product] = await db
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.id, productId), eq(products.storeId, storeId)))
		.limit(1);
	if (!product) return { error: fail(400, { error: 'Product not found.' }) };

	return { values: { productId, videoUrl, caption, isPublished, sortOrder } };
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const result = await readReelForm(await request.formData(), store.id);
		if (result.error) return result.error;

		await db.insert(productReels).values({ id: nanoid(), storeId: store.id, ...result.values });
		return { success: 'Reel added.' };
	},

	update: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const result = await readReelForm(fd, store.id);
		if (result.error) return result.error;

		await db
			.update(productReels)
			.set(result.values)
			.where(and(eq(productReels.id, id), eq(productReels.storeId, store.id)));
		return { success: 'Reel updated.' };
	},

	togglePublish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const publish = fd.get('publish') === '1';

		await db
			.update(productReels)
			.set({ isPublished: publish })
			.where(and(eq(productReels.id, id), eq(productReels.storeId, store.id)));
		return { success: publish ? 'Reel published.' : 'Reel hidden.' };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');

		await db
			.delete(productReels)
			.where(and(eq(productReels.id, id), eq(productReels.storeId, store.id)));
		return { success: 'Reel deleted.' };
	}
};
