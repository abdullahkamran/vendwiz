import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { OrderItem } from '$lib/db/schema';

export const GET: RequestHandler = async ({ url, locals }) => {
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const ref = url.searchParams.get('ref');
	const email = url.searchParams.get('email');

	if (!ref || !email) throw error(400, 'ref and email are required');

	const order = await db
		.select()
		.from(orders)
		.where(and(eq(orders.storeId, store.id), eq(orders.orderRef, ref)))
		.limit(1)
		.then((r) => r[0] ?? null);

	if (!order) throw error(404, 'Order not found');

	// Verify email matches (case-insensitive)
	if (order.customerEmail.toLowerCase() !== email.toLowerCase()) {
		throw error(404, 'Order not found');
	}

	// Return safe subset — no full customer detail leak
	const items = (order.items as OrderItem[]).map((i) => ({
		title: i.title,
		quantity: i.quantity,
		price: i.price
	}));

	return json({
		orderRef: order.orderRef,
		status: order.status,
		items,
		total: order.total,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt
	});
};
