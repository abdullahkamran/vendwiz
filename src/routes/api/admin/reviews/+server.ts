import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { reviews, products } from '$lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const status = url.searchParams.get('status') ?? 'all';

	const conditions = [eq(reviews.storeId, store.id)];

	if (status === 'approved') {
		conditions.push(eq(reviews.isApproved, true));
	} else if (status === 'pending') {
		conditions.push(eq(reviews.isApproved, false));
	}
	// 'all' => no extra filter

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

	return json({ reviews: results });
};
