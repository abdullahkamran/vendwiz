import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, products, productOptionGroups, productOptionValues } from '$lib/server/db/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { pickItemImage } from '$lib/utils/orderItemImage';
import { buildWhatsAppUrl } from '$lib/utils/whatsapp';
import { whatsappDigits } from '$lib/utils/phone';
import { restoreOrderStock } from '$lib/server/orderStock';

type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'completed' | 'cancelled';

const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'dispatched', 'completed', 'cancelled'];

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

	const rawItems = await db
		.select()
		.from(orderItems)
		.where(eq(orderItems.orderId, order.id));

	// Order items don't store an image, so look one up: the colour/option image the customer
	// picked if there is one, otherwise the product's first image.
	const productIds = [...new Set(rawItems.map((i) => i.productId).filter((id): id is string => !!id))];
	const [productRows, optionImageRows] = productIds.length
		? await Promise.all([
				db.select({ id: products.id, images: products.images }).from(products).where(inArray(products.id, productIds)),
				db
					.select({
						productId: productOptionGroups.productId,
						label: productOptionValues.label,
						value: productOptionValues.value,
						imageUrl: productOptionValues.imageUrl
					})
					.from(productOptionValues)
					.innerJoin(productOptionGroups, eq(productOptionValues.groupId, productOptionGroups.id))
					.where(and(inArray(productOptionGroups.productId, productIds), isNotNull(productOptionValues.imageUrl)))
			])
		: [[], []];
	const items = rawItems.map((item) => ({
		...item,
		imageUrl: pickItemImage(item, productRows, optionImageRows)
	}));

	// Any status can move to any other, except that a cancelled order is final
	const allowedNext = order.status === 'cancelled' ? [] : ALL_STATUSES.filter((s) => s !== order.status);

	// Confirmation message to the BUYER, sent to the phone number they gave at checkout
	// (stored with its country code, so wa.me can open their chat directly)
	const buyerDigits = whatsappDigits(order.customerPhone);
	const waMessage =
		`Hi ${order.customerName}, thank you for your order at ${store.name}! ` +
		`Your order #${order.orderNumber} is confirmed. Total: ${store.currencySymbol} ${order.total}. ` +
		`We'll keep you posted on its progress.`;
	const waUrl = buyerDigits ? buildWhatsAppUrl(buyerDigits, waMessage) : null;

	return { order, items, allowedNext, waUrl, storeWhatsapp: store.whatsapp, store };
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

		if (!ALL_STATUSES.includes(newStatus)) {
			return fail(400, { error: 'Please choose a valid status' });
		}
		// A cancelled order is final: its stock has already been returned
		if (order.status === 'cancelled' && newStatus !== 'cancelled') {
			return fail(422, { error: 'This order is cancelled and its status can no longer be changed.' });
		}

		const updateData: Partial<typeof orders.$inferInsert> = {
			status: newStatus,
			updatedAt: new Date()
		};
		if (notes !== null) updateData.notes = notes;

		await db
			.update(orders)
			.set(updateData)
			.where(and(eq(orders.id, params.id), eq(orders.storeId, store.id)));

		// Moving into cancelled returns the order's items to stock (once)
		if (newStatus === 'cancelled' && order.status !== 'cancelled') {
			await restoreOrderStock(order.id);
		}

		return { success: true, status: newStatus };
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
