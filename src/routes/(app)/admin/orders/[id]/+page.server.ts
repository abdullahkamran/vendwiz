import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildOrderConfirmationMessage, buildWhatsAppUrl } from '$lib/utils/whatsapp';

type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'completed' | 'cancelled';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	pending: ['processing', 'cancelled'],
	processing: ['dispatched', 'cancelled'],
	dispatched: ['completed', 'cancelled'],
	completed: [],
	cancelled: []
};

export const load: PageServerLoad = async ({ params, locals }) => {
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

	const allowedNext = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
	const waMessage = buildOrderConfirmationMessage(order);
	const waUrl = store.whatsapp ? buildWhatsAppUrl(store.whatsapp, waMessage) : null;

	return { order, allowedNext, waUrl, storeWhatsapp: store.whatsapp };
};

export const actions: Actions = {
	updateStatus: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const newStatus = fd.get('status') as OrderStatus;
		const notes = fd.get('notes') as string | null;

		const order = await db
			.select()
			.from(orders)
			.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)))
			.limit(1)
			.then((r) => r[0] ?? null);

		if (!order) return fail(404, { error: 'Order not found' });

		const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
		if (!allowed.includes(newStatus)) {
			return fail(422, {
				error: `Cannot transition from ${order.status} to ${newStatus}`
			});
		}

		const updateData: Partial<typeof orders.$inferInsert> = {
			status: newStatus,
			updatedAt: new Date()
		};
		if (notes) updateData.notes = notes;

		await db
			.update(orders)
			.set(updateData)
			.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)));

		return { success: true };
	},

	saveNotes: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const store = locals.store;
		if (!store) return fail(400, { error: 'No store context' });

		const fd = await request.formData();
		const notes = fd.get('notes') as string;

		await db
			.update(orders)
			.set({ notes, updatedAt: new Date() })
			.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)));

		return { success: true };
	}
};
