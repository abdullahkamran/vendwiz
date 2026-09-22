import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const status = url.searchParams.get('status') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const search = url.searchParams.get('search') ?? '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const limit = 20;
	const offset = (page - 1) * limit;

	const conditions = [eq(orders.storeId, store.id)];

	if (status && status !== 'all') {
		conditions.push(
			eq(
				orders.status,
				status as 'pending' | 'processing' | 'dispatched' | 'completed' | 'cancelled'
			)
		);
	}
	if (from) conditions.push(gte(orders.createdAt, new Date(from)));
	if (to) conditions.push(lte(orders.createdAt, new Date(to)));

	const results = await db
		.select()
		.from(orders)
		.where(and(...conditions))
		.orderBy(desc(orders.createdAt))
		.limit(limit + 1)
		.offset(offset);

	const filtered = search
		? results.filter(
				(o) =>
					o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
					o.customerName.toLowerCase().includes(search.toLowerCase())
			)
		: results;

	const hasNext = filtered.length > limit;
	const ordersData = hasNext ? filtered.slice(0, limit) : filtered;

	return {
		orders: ordersData,
		hasNext,
		hasPrev: page > 1,
		page,
		filters: { status, from, to, search }
	};
};
