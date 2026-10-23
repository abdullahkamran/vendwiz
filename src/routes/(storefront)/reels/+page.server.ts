import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { productReels, products } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

/**
 * The feed itself is fetched client-side from /api/storefront/reels. This only resolves the
 * product behind a shared link (?v=<reel id>) so WhatsApp / Messenger / Facebook previews show
 * its name and photo.
 */
export const load: PageServerLoad = async ({ locals, url, parent }) => {
	// Nothing to show (e.g. an app installed before the reels were removed): go Home instead
	const { basePath, hasReels } = await parent();
	if (!hasReels) throw redirect(302, basePath || '/');

	const reelId = url.searchParams.get('v');
	if (!reelId || !locals.store) return { shared: null };

	const [row] = await db
		.select({ title: products.title, images: products.images, caption: productReels.caption })
		.from(productReels)
		.innerJoin(products, eq(productReels.productId, products.id))
		.where(
			and(
				eq(productReels.id, reelId),
				eq(productReels.storeId, locals.store.id),
				eq(productReels.isPublished, true),
				eq(products.isPublished, true)
			)
		)
		.limit(1);
	if (!row) return { shared: null };

	const images = ((row.images as { url: string; order: number }[]) ?? []).slice().sort((a, b) => a.order - b.order);
	return { shared: { title: row.title, caption: row.caption, image: images[0]?.url ?? null } };
};
