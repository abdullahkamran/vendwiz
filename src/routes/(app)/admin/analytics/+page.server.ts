import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders, products } from '$lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { OrderItem } from '$lib/db/schema';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const range = url.searchParams.get('range') ?? '30d';
	const customFrom = url.searchParams.get('from') ?? '';
	const customTo = url.searchParams.get('to') ?? '';

	let fromDate: Date;
	const toDate = new Date();

	if (range === '7d') {
		fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	} else if (range === '90d') {
		fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
	} else if (range === 'all') {
		fromDate = new Date('2000-01-01');
	} else if (range === 'custom' && customFrom) {
		fromDate = new Date(customFrom);
	} else {
		// default 30d
		fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	}

	const toDateFinal = customTo ? new Date(customTo) : toDate;

	const conditions = [
		eq(orders.storeId, store.id),
		gte(orders.createdAt, fromDate),
		lte(orders.createdAt, toDateFinal)
	];

	const allOrders = await db
		.select()
		.from(orders)
		.where(and(...conditions));

	const totalOrders = allOrders.length;
	const revenueOrders = allOrders.filter((o) => o.status !== 'cancelled');
	const totalRevenue = revenueOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
	const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;
	const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;

	// Orders by day
	const dayMap = new Map<string, { count: number; revenue: number }>();
	for (const o of allOrders) {
		const day = o.createdAt.toISOString().slice(0, 10);
		const ex = dayMap.get(day) ?? { count: 0, revenue: 0 };
		ex.count++;
		if (o.status !== 'cancelled') ex.revenue += parseFloat(o.total);
		dayMap.set(day, ex);
	}
	const ordersByDay = Array.from(dayMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }));

	// Status breakdown
	const statusMap = new Map<string, number>();
	for (const o of allOrders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
	const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

	// Top products
	const productMap = new Map<string, { title: string; qtySold: number; revenue: number }>();
	for (const o of revenueOrders) {
		for (const item of o.items as OrderItem[]) {
			const ex = productMap.get(item.productId) ?? { title: item.title, qtySold: 0, revenue: 0 };
			ex.qtySold += item.quantity;
			ex.revenue += item.price * item.quantity;
			productMap.set(item.productId, ex);
		}
	}
	const topProducts = Array.from(productMap.entries())
		.map(([productId, v]) => ({ productId, ...v }))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10);

	// Low stock
	const lowStockProducts = await db
		.select({
			id: products.id,
			title: products.title,
			stock: products.stockQuantity,
			threshold: products.lowStockThreshold
		})
		.from(products)
		.where(
			and(
				eq(products.storeId, store.id),
				eq(products.isActive, true),
				sql`${products.stockQuantity} <= ${products.lowStockThreshold}`
			)
		);

	return {
		range,
		customFrom,
		customTo,
		totalOrders,
		totalRevenue,
		avgOrderValue,
		pendingOrders,
		ordersByDay,
		topProducts,
		statusBreakdown,
		lowStockProducts
	};
};
