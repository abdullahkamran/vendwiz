import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { productReels, products } from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { parseVideoSource } from '$lib/utils/video';

const MAX_LIMIT = 30;

/**
 * Published reels for the current store, each with the product it shows (title, slug, image, price).
 * Paged with ?offset=&limit= so the feed can load more as the shopper scrolls.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.store) throw error(404, 'Store not found');

	const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '10', 10) || 10));
	const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);

	const visible = and(
		eq(productReels.storeId, locals.store.id),
		eq(productReels.isPublished, true),
		eq(products.isPublished, true)
	);
	// A shared link (?focus=<reel id>) puts that reel first on the first page
	const focus = offset === 0 ? url.searchParams.get('focus') : null;

	const select = {
		id: productReels.id,
		videoUrl: productReels.videoUrl,
		caption: productReels.caption,
		productId: products.id,
		title: products.title,
		slug: products.slug,
		images: products.images,
		basePrice: products.basePrice,
		salePrice: products.salePrice
	};

	const [focused, rows] = await Promise.all([
		focus
			? db
					.select(select)
					.from(productReels)
					.innerJoin(products, eq(productReels.productId, products.id))
					.where(and(visible, eq(productReels.id, focus)))
					.limit(1)
			: Promise.resolve([]),
		db
			.select(select)
			.from(productReels)
			.innerJoin(products, eq(productReels.productId, products.id))
			.where(visible)
			.orderBy(asc(productReels.sortOrder), desc(productReels.createdAt), asc(productReels.id))
			// Fetch one extra row to know whether another page exists
			.limit(limit + 1)
			.offset(offset)
	]);

	const hasMore = rows.length > limit;
	const page = rows.slice(0, limit);
	if (focused[0]) page.unshift(...focused);
	const seen = new Set<string>();
	const reels = page
		.filter((r) => !seen.has(r.id) && !!seen.add(r.id))
		.map((r) => {
			const source = parseVideoSource(r.videoUrl);
			if (!source) return null;
			const images = ((r.images as { url: string; order: number }[]) ?? []).slice().sort((a, b) => a.order - b.order);
			return {
				id: r.id,
				source,
				caption: r.caption,
				product: {
					id: r.productId,
					title: r.title,
					slug: r.slug,
					image: images[0]?.url ?? null,
					basePrice: Number(r.basePrice),
					salePrice: r.salePrice === null ? null : Number(r.salePrice)
				}
			};
		})
		.filter((r) => r !== null);

	return json({ reels, nextOffset: hasMore ? offset + limit : null });
};
