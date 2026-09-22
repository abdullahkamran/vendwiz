import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reviews, products } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const status = url.searchParams.get('status') ?? 'all';

	const conditions = [eq(reviews.storeId, store.id)];

	if (status === 'approved') {
		conditions.push(eq(reviews.status, 'approved'));
	} else if (status === 'pending') {
		conditions.push(eq(reviews.status, 'pending'));
	} else if (status === 'hidden') {
		conditions.push(eq(reviews.status, 'hidden'));
	}
	// 'all' => no extra filter

	const results = await db
		.select({
			id: reviews.id,
			productId: reviews.productId,
			storeId: reviews.storeId,
			reviewerName: reviews.reviewerName,
			rating: reviews.rating,
			body: reviews.body,
			status: reviews.status,
			createdAt: reviews.createdAt,
			productTitle: products.title
		})
		.from(reviews)
		.leftJoin(products, eq(reviews.productId, products.id))
		.where(and(...conditions))
		.orderBy(desc(reviews.createdAt));

	return json({ reviews: results });
};
