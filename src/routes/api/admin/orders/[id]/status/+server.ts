import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { orderStatusSchema } from '$lib/schemas/orders';

type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'completed' | 'cancelled';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	pending: ['processing', 'cancelled'],
	processing: ['dispatched', 'cancelled'],
	dispatched: ['completed', 'cancelled'],
	completed: [],
	cancelled: []
};

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

	const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
	if (!allowed.includes(parsed.data.status)) {
		throw error(422, `Cannot transition from ${order.status} to ${parsed.data.status}`);
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

	return json(updated);
};
