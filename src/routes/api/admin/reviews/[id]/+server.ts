import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reviews } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
	status: z.enum(['pending', 'approved', 'hidden'])
});

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const body = await request.json();
	const parsed = updateSchema.safeParse(body);
	if (!parsed.success) throw error(400, parsed.error.message);

	const [updated] = await db
		.update(reviews)
		.set({ status: parsed.data.status })
		.where(and(eq(reviews.id, params.id), eq(reviews.storeId, store.id)))
		.returning();

	if (!updated) throw error(404, 'Review not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const [deleted] = await db
		.delete(reviews)
		.where(and(eq(reviews.id, params.id), eq(reviews.storeId, store.id)))
		.returning();

	if (!deleted) throw error(404, 'Review not found');
	return json({ success: true });
};
