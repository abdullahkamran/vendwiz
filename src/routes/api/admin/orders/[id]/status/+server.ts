import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { restoreOrderStock } from '$lib/server/orderStock';
import { orderStatusSchema } from '$lib/schemas/orders';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const body = await request.json();
	const parsed = orderStatusSchema.safeParse(body);
	if (!parsed.success) throw error(400, parsed.error.message);

	const order = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)))
		.limit(1)
		.then((r) => r[0] ?? null);

	if (!order) throw error(404, 'Order not found');

	// A cancelled order is final: its stock has been returned, so it can't be reopened.
	if (order.status === 'cancelled' && parsed.data.status !== 'cancelled') {
		throw error(422, 'This order is cancelled and its status can no longer be changed.');
	}

	const updateData: Partial<typeof orders.$inferInsert> = {
		status: parsed.data.status,
		updatedAt: new Date()
	};
	if (parsed.data.notes !== undefined) {
		updateData.notes = parsed.data.notes;
	}

	const [updated] = await db
		.update(orders)
		.set(updateData)
		.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)))
		.returning();

	// ── Restore inventory when an order moves into cancelled ───────────────
	// (only on the actual transition, so re-saving a cancelled order can't restore twice)
	if (parsed.data.status === 'cancelled' && order.status !== 'cancelled') {
		await restoreOrderStock(params.id);
	}

	return json(updated);
};
