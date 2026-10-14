import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { loadCompletedOrders } from '$lib/server/analyticsOverview';
import { completedOrdersCsv, isMonthKey, monthKey, storeTimeZone } from '$lib/utils/analytics';

/** CSV of one month's completed orders (final amount after tax and discount, shipping excluded). */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const requested = url.searchParams.get('month');
	const month = isMonthKey(requested) ? requested : monthKey(new Date(), storeTimeZone(store.currencyCode));

	const rows = await loadCompletedOrders(store, month);
	const csv = completedOrdersCsv(rows);

	return new Response('﻿' + csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="completed-orders-${month}.csv"`
		}
	});
};
