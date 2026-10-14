import { db } from '$lib/server/db';
import { orders, reviews, products } from '$lib/server/db/schema';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import {
	addMonths,
	buildMonthlySeries,
	isMonthKey,
	lastMonths,
	monthKey,
	monthLabel,
	monthToDate,
	percentChange,
	revenueOf,
	storeTimeZone,
	summarizeReviews,
	type OrderLite
} from '$lib/utils/analytics';

type StoreLite = { id: string; currencyCode?: string | null };

/** Start of a calendar month in UTC, minus a day of slack so every time zone is covered. */
function windowStart(key: string): Date {
	const [y, m] = key.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, 1) - 24 * 60 * 60 * 1000);
}

async function loadOrders(storeId: string, fromKey: string): Promise<OrderLite[]> {
	return db
		.select({
			id: orders.id,
			orderNumber: orders.orderNumber,
			customerName: orders.customerName,
			status: orders.status,
			createdAt: orders.createdAt,
			total: orders.total,
			shippingFee: orders.shippingFee
		})
		.from(orders)
		.where(and(eq(orders.storeId, storeId), gte(orders.createdAt, windowStart(fromKey))));
}

/** Completed orders placed in a month, newest first (shared by the page and the CSV export). */
export async function loadCompletedOrders(store: StoreLite, selectedMonth: string) {
	const timeZone = storeTimeZone(store.currencyCode);
	const all = await loadOrders(store.id, selectedMonth);
	const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: 'short', year: 'numeric' });
	return all
		.filter((o) => o.status === 'completed' && monthKey(o.createdAt, timeZone) === selectedMonth)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.map((o) => ({
			id: o.id,
			orderNumber: o.orderNumber,
			customerName: o.customerName,
			date: dateFormat.format(o.createdAt),
			amount: revenueOf(o)
		}));
}

export async function loadOverview(
	store: StoreLite,
	params: { month: string | null; months: string | null },
	now = new Date()
) {
	const timeZone = storeTimeZone(store.currencyCode);
	const currentKey = monthKey(now, timeZone);
	const selectedMonth = isMonthKey(params.month) && params.month <= currentKey ? params.month : currentKey;
	const tableMonths = [3, 6, 12].includes(Number(params.months)) ? Number(params.months) : 6;

	// 13 months: the 12 on the chart plus the one before it, so the first month also has a comparison
	const allOrders = await loadOrders(store.id, addMonths(selectedMonth, -12));
	const series = buildMonthlySeries(allOrders, timeZone, selectedMonth, 13);
	const selected = series[12];
	const previous = series[11];

	const kpis = {
		revenue: { value: selected.revenue, change: percentChange(selected.revenue, previous.revenue) },
		orders: { value: selected.orders, change: percentChange(selected.orders, previous.orders) },
		avgOrderValue: { value: selected.avgOrderValue, change: percentChange(selected.avgOrderValue, previous.avgOrderValue) },
		cancellationRate: {
			value: selected.cancellationRate,
			change: percentChange(selected.cancellationRate, previous.cancellationRate)
		}
	};

	const todayComparison =
		selectedMonth === currentKey
			? (() => {
					const mtd = monthToDate(allOrders, timeZone, now);
					return {
						day: mtd.day,
						previousLabel: monthLabel(mtd.previousKey),
						current: mtd.current,
						previous: mtd.previous,
						revenueChange: percentChange(mtd.current.revenue, mtd.previous.revenue)
					};
				})()
			: null;

	const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: 'short', year: 'numeric' });
	const completedOrders = allOrders
		.filter((o) => o.status === 'completed' && monthKey(o.createdAt, timeZone) === selectedMonth)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.map((o) => ({
			id: o.id,
			orderNumber: o.orderNumber,
			customerName: o.customerName,
			date: dateFormat.format(o.createdAt),
			amount: revenueOf(o)
		}));

	// ── Totals: everything generated so far, and the current calendar month.
	// Same rule as everywhere else: completed orders, final amount after tax and discount, no shipping.
	const [lifetime] = await db
		.select({
			amount: sql<string>`coalesce(sum(greatest(${orders.total} - ${orders.shippingFee}, 0)), 0)`,
			count: sql<number>`count(*)::int`
		})
		.from(orders)
		.where(and(eq(orders.storeId, store.id), eq(orders.status, 'completed')));

	const thisMonthSoFar = monthToDate(allOrders, timeZone, now);
	const thisMonthStats = buildMonthlySeries(allOrders, timeZone, currentKey, 1)[0];
	const totals = {
		allTime: Number(lifetime?.amount ?? 0),
		allTimeOrders: Number(lifetime?.count ?? 0),
		thisMonth: thisMonthStats.revenue,
		thisMonthOrders: thisMonthStats.completed,
		thisMonthLabel: monthLabel(currentKey),
		// this month so far vs the same days of last month
		thisMonthChange: percentChange(thisMonthSoFar.current.revenue, thisMonthSoFar.previous.revenue),
		previousMonthLabel: monthLabel(thisMonthSoFar.previousKey)
	};

	// ── Reviews
	const reviewRows = await db
		.select({
			productId: reviews.productId,
			rating: reviews.rating,
			status: reviews.status,
			reviewerName: reviews.reviewerName,
			body: reviews.body,
			createdAt: reviews.createdAt
		})
		.from(reviews)
		.where(eq(reviews.storeId, store.id))
		.orderBy(desc(reviews.createdAt));

	const reviewSummary = summarizeReviews(reviewRows);
	const latestApproved = reviewRows.filter((r) => r.status === 'approved').slice(0, 5);
	const productIds = [
		...new Set([
			...reviewSummary.bestProducts.map((p) => p.productId),
			...reviewSummary.worstProducts.map((p) => p.productId),
			...latestApproved.map((r) => r.productId)
		])
	];
	const titleRows = productIds.length
		? await db.select({ id: products.id, title: products.title }).from(products).where(inArray(products.id, productIds))
		: [];
	const titleOf = new Map(titleRows.map((t) => [t.id, t.title]));
	const countInMonth = (key: string) =>
		reviewRows.filter((r) => r.status === 'approved' && monthKey(r.createdAt, timeZone) === key).length;

	return {
		timeZone,
		selectedMonth,
		selectedLabel: monthLabel(selectedMonth),
		previousLabel: monthLabel(addMonths(selectedMonth, -1)),
		isCurrentMonth: selectedMonth === currentKey,
		monthOptions: lastMonths(currentKey, 12)
			.reverse()
			.map((key) => ({ key, label: monthLabel(key) })),
		tableMonths,
		kpis,
		totals,
		todayComparison,
		chartSeries: series.slice(1), // 12 months ending at the selected month
		tableSeries: series.slice(13 - tableMonths).reverse(), // newest first
		statusCounts: {
			pending: selected.pending,
			processing: selected.processing,
			dispatched: selected.dispatched,
			completed: selected.completed,
			cancelled: selected.cancelled
		},
		completedOrders,
		completedTotal: completedOrders.reduce((s, o) => s + o.amount, 0),
		reviews: {
			total: reviewSummary.total,
			pending: reviewSummary.pending,
			average: reviewSummary.average,
			distribution: reviewSummary.distribution,
			newThisMonth: countInMonth(selectedMonth),
			newLastMonth: countInMonth(addMonths(selectedMonth, -1)),
			best: reviewSummary.bestProducts.map((p) => ({ ...p, title: titleOf.get(p.productId) ?? 'Product' })),
			worst: reviewSummary.worstProducts.map((p) => ({ ...p, title: titleOf.get(p.productId) ?? 'Product' })),
			latest: latestApproved.map((r) => ({
				productTitle: titleOf.get(r.productId) ?? 'Product',
				reviewerName: r.reviewerName,
				rating: r.rating,
				body: r.body,
				date: dateFormat.format(r.createdAt)
			}))
		}
	};
}
