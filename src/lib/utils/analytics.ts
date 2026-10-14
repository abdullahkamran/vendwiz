/**
 * Pure helpers for the admin analytics overview (calendar months, month-over-month changes,
 * review summaries, CSV export). Kept free of database / framework imports so they are easy to test.
 *
 * Revenue rules:
 *  - only COMPLETED orders count as revenue;
 *  - the amount is the final order amount after tax and discount, excluding shipping
 *    (order total − shipping fee);
 *  - an order belongs to the month it was PLACED in (the app doesn't record completion dates).
 */

export type OrderLite = {
	id: string;
	orderNumber: string;
	customerName: string;
	status: string;
	createdAt: Date;
	total: string | number;
	shippingFee: string | number;
};

export const ORDER_STATUSES = ['pending', 'processing', 'dispatched', 'completed', 'cancelled'] as const;

/** Revenue of one order: final amount after tax and discount, shipping excluded. */
export function revenueOf(order: Pick<OrderLite, 'total' | 'shippingFee'>): number {
	return Math.max(0, Number(order.total) - Number(order.shippingFee));
}

// ── Time zone & calendar months ──────────────────────────────────────────────

const CURRENCY_TIME_ZONES: Record<string, string> = {
	PKR: 'Asia/Karachi',
	INR: 'Asia/Kolkata',
	BDT: 'Asia/Dhaka',
	AED: 'Asia/Dubai',
	SAR: 'Asia/Riyadh',
	GBP: 'Europe/London',
	EUR: 'Europe/Berlin',
	USD: 'America/New_York',
	CAD: 'America/Toronto',
	AUD: 'Australia/Sydney'
};

/** Best-effort store time zone (stores have no timezone setting): inferred from the currency. */
export function storeTimeZone(currencyCode: string | null | undefined): string {
	return CURRENCY_TIME_ZONES[currencyCode ?? ''] ?? 'UTC';
}

/** 'YYYY-MM' of an instant as seen in the given time zone. */
export function monthKey(date: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date);
	const year = parts.find((p) => p.type === 'year')!.value;
	const month = parts.find((p) => p.type === 'month')!.value;
	return `${year}-${month}`;
}

/** Day of the month (1–31) of an instant as seen in the given time zone. */
export function dayOfMonth(date: Date, timeZone: string): number {
	return Number(new Intl.DateTimeFormat('en-CA', { timeZone, day: 'numeric' }).format(date));
}

export function isMonthKey(value: string | null | undefined): value is string {
	return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(key: string, delta: number): string {
	const [y, m] = key.split('-').map(Number);
	const index = y * 12 + (m - 1) + delta;
	return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, style: 'short' | 'long' = 'long'): string {
	const [y, m] = key.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: style === 'long' ? 'long' : 'short', year: 'numeric' }).format(
		new Date(Date.UTC(y, m - 1, 1))
	);
}

/** The n months ending at (and including) endKey, oldest first. */
export function lastMonths(endKey: string, n: number): string[] {
	return Array.from({ length: n }, (_, i) => addMonths(endKey, i - (n - 1)));
}

// ── Monthly statistics ───────────────────────────────────────────────────────

export type MonthStats = {
	key: string;
	label: string;
	shortLabel: string;
	orders: number; // placed, any status
	pending: number;
	processing: number;
	dispatched: number;
	completed: number;
	cancelled: number;
	revenue: number; // completed orders only
	avgOrderValue: number; // revenue / completed orders
	cancellationRate: number; // cancelled / placed, 0–100
};

export function buildMonthlySeries(orders: OrderLite[], timeZone: string, endKey: string, months: number): MonthStats[] {
	const byMonth = new Map<string, OrderLite[]>();
	for (const o of orders) {
		const key = monthKey(o.createdAt, timeZone);
		(byMonth.get(key) ?? byMonth.set(key, []).get(key)!).push(o);
	}

	return lastMonths(endKey, months).map((key) => {
		const list = byMonth.get(key) ?? [];
		const count = (status: string) => list.filter((o) => o.status === status).length;
		const completed = list.filter((o) => o.status === 'completed');
		const revenue = completed.reduce((sum, o) => sum + revenueOf(o), 0);
		return {
			key,
			label: monthLabel(key),
			shortLabel: monthLabel(key, 'short'),
			orders: list.length,
			pending: count('pending'),
			processing: count('processing'),
			dispatched: count('dispatched'),
			completed: completed.length,
			cancelled: count('cancelled'),
			revenue,
			avgOrderValue: completed.length ? revenue / completed.length : 0,
			cancellationRate: list.length ? (count('cancelled') / list.length) * 100 : 0
		};
	});
}

/** Percent change from previous to current; null when it can't be expressed (previous was 0). */
export function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return current === 0 ? 0 : null;
	return ((current - previous) / previous) * 100;
}

/**
 * "So far this month" vs the same days of last month, so a half-finished month is compared
 * fairly with the matching part of the previous one.
 */
export function monthToDate(orders: OrderLite[], timeZone: string, now: Date) {
	const currentKey = monthKey(now, timeZone);
	const previousKey = addMonths(currentKey, -1);
	const day = dayOfMonth(now, timeZone);

	const sum = (key: string) => {
		const inScope = orders.filter((o) => monthKey(o.createdAt, timeZone) === key && dayOfMonth(o.createdAt, timeZone) <= day);
		const completed = inScope.filter((o) => o.status === 'completed');
		return { orders: inScope.length, revenue: completed.reduce((s, o) => s + revenueOf(o), 0) };
	};
	return { day, currentKey, previousKey, current: sum(currentKey), previous: sum(previousKey) };
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export type ReviewLite = { productId: string; rating: number; status: string };

export function summarizeReviews(reviews: ReviewLite[]) {
	const approved = reviews.filter((r) => r.status === 'approved');
	const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: approved.filter((r) => r.rating === stars).length }));
	const average = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;

	const perProduct = new Map<string, { sum: number; count: number }>();
	for (const r of approved) {
		const cur = perProduct.get(r.productId) ?? { sum: 0, count: 0 };
		cur.sum += r.rating;
		cur.count++;
		perProduct.set(r.productId, cur);
	}
	const products = [...perProduct.entries()].map(([productId, v]) => ({ productId, average: v.sum / v.count, count: v.count }));

	return {
		total: approved.length,
		pending: reviews.filter((r) => r.status === 'pending').length,
		average,
		distribution,
		// Best first by average, then by how many reviews back it up
		bestProducts: [...products].sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 3),
		worstProducts: [...products].sort((a, b) => a.average - b.average || b.count - a.count).slice(0, 3)
	};
}

// ── CSV export ───────────────────────────────────────────────────────────────

/** Escapes one CSV cell; also neutralises spreadsheet formulas (=, +, -, @) in customer-supplied text. */
export function csvCell(value: string | number): string {
	let text = String(value);
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function completedOrdersCsv(
	rows: Array<{ orderNumber: string; date: string; customerName: string; amount: number }>
): string {
	const lines = [['Order', 'Date', 'Customer', 'Amount'].join(',')];
	for (const r of rows) {
		lines.push([csvCell(r.orderNumber), csvCell(r.date), csvCell(r.customerName), csvCell(r.amount.toFixed(2))].join(','));
	}
	lines.push(['', '', csvCell('Total'), csvCell(rows.reduce((s, r) => s + r.amount, 0).toFixed(2))].join(','));
	return lines.join('\r\n') + '\r\n';
}
