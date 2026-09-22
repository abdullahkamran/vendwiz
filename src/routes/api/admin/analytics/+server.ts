import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, products } from '$lib/server/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	const conditions = [eq(orders.storeId, store.id)];
	if (fromParam) conditions.push(gte(orders.createdAt, new Date(fromParam)));
	if (toParam) conditions.push(lte(orders.createdAt, new Date(toParam)));

	// Fetch all orders in range
	const allOrders = await db
		.select()
		.from(orders)
		.where(and(...conditions));

	// Total orders
	const totalOrders = allOrders.length;

	// Revenue orders (non-cancelled)
	const revenueOrders = allOrders.filter((o) => o.status !== 'cancelled');
	const totalRevenue = revenueOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
	const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

	// Pending count
	const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;

	// Orders by day
	const dayMap = new Map<string, { count: number; revenue: number }>();
	for (const o of allOrders) {
		const day = o.createdAt.toISOString().slice(0, 10);
		const existing = dayMap.get(day) ?? { count: 0, revenue: 0 };
		existing.count++;
		if (o.status !== 'cancelled') existing.revenue += parseFloat(o.total);
		dayMap.set(day, existing);
	}
	const ordersByDay = Array.from(dayMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }));

	// Status breakdown
	const statusMap = new Map<string, number>();
	for (const o of allOrders) {
		statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
	}
	const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
		status,
		count
	}));

	// Top products — fetch from orderItems table
	const revenueOrderIds = revenueOrders.map((o) => o.id);
	const allOrderItems =
		revenueOrderIds.length > 0
			? await db.select().from(orderItems).where(inArray(orderItems.orderId, revenueOrderIds))
			: [];

	const productMap = new Map<string, { title: string; qtySold: number; revenue: number }>();
	for (const item of allOrderItems) {
		const id = item.productId ?? item.id;
		const existing = productMap.get(id) ?? {
			title: item.productTitle,
			qtySold: 0,
			revenue: 0
		};
		existing.qtySold += item.quantity;
		existing.revenue += parseFloat(item.subtotal);
		productMap.set(id, existing);
	}
	const topProducts = Array.from(productMap.entries())
		.map(([productId, v]) => ({ productId, ...v }))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10);

	// Low stock products
	const lowStockProducts = await db
		.select({
			id: products.id,
			title: products.title,
			stock: products.stockQty,
			threshold: products.lowStockThreshold
		})
		.from(products)
		.where(
			and(
				eq(products.storeId, store.id),
				eq(products.isPublished, true),
				sql`${products.stockQty} <= ${products.lowStockThreshold}`
			)
		);

	return json({
		totalOrders,
		totalRevenue,
		avgOrderValue,
		pendingOrders,
		ordersByDay,
		topProducts,
		statusBreakdown,
		lowStockProducts
	});
};
