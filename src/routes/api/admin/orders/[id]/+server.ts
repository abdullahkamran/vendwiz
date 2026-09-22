import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { orderNotesSchema } from '$lib/schemas/orders';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const order = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)))
		.limit(1)
		.then((r) => r[0] ?? null);

	if (!order) throw error(404, 'Order not found');
	return json(order);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const body = await request.json();
	const parsed = orderNotesSchema.safeParse(body);
	if (!parsed.success) throw error(400, parsed.error.message);

	const [updated] = await db
		.update(orders)
		.set({ notes: parsed.data.notes, updatedAt: new Date() })
		.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)))
		.returning();

	if (!updated) throw error(404, 'Order not found');
	return json(updated);
};
