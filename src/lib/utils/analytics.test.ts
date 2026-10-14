import { describe, it, expect } from 'vitest';
import {
	revenueOf,
	storeTimeZone,
	monthKey,
	dayOfMonth,
	addMonths,
	lastMonths,
	isMonthKey,
	buildMonthlySeries,
	percentChange,
	monthToDate,
	summarizeReviews,
	csvCell,
	completedOrdersCsv,
	type OrderLite
} from './analytics';

const order = (over: Partial<Omit<OrderLite, 'createdAt'>> & { createdAt: string }): OrderLite => ({
	id: Math.random().toString(36).slice(2),
	orderNumber: 'ORD-1',
	customerName: 'Ali',
	status: 'completed',
	total: '1100',
	shippingFee: '100',
	...over,
	createdAt: new Date(over.createdAt)
});

describe('revenue', () => {
	it('is the final amount after tax and discount, without shipping', () => {
		expect(revenueOf({ total: '1100.00', shippingFee: '100.00' })).toBe(1000);
		expect(revenueOf({ total: '50', shippingFee: '80' })).toBe(0); // never negative
	});
});

describe('calendar months', () => {
	it('uses the store time zone: a late-evening UTC order is already next month in Karachi', () => {
		const instant = new Date('2026-09-30T20:00:00Z'); // 01:00 on 1 Oct in Pakistan
		expect(monthKey(instant, 'UTC')).toBe('2026-09');
		expect(monthKey(instant, 'Asia/Karachi')).toBe('2026-10');
		expect(dayOfMonth(instant, 'Asia/Karachi')).toBe(1);
	});
	it('infers a zone from the currency', () => {
		expect(storeTimeZone('PKR')).toBe('Asia/Karachi');
		expect(storeTimeZone('XXX')).toBe('UTC');
	});
	it('adds months across year boundaries and lists a window', () => {
		expect(addMonths('2026-01', -1)).toBe('2025-12');
		expect(addMonths('2026-11', 3)).toBe('2027-02');
		expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
	});
	it('validates month keys', () => {
		expect(isMonthKey('2026-10')).toBe(true);
		expect(isMonthKey('2026-13')).toBe(false);
		expect(isMonthKey('oct')).toBe(false);
	});
});

describe('buildMonthlySeries', () => {
	const orders = [
		order({ createdAt: '2026-09-05T10:00:00Z' }),
		order({ createdAt: '2026-09-10T10:00:00Z', status: 'cancelled' }),
		order({ createdAt: '2026-10-02T10:00:00Z', total: '2100', shippingFee: '100' }),
		order({ createdAt: '2026-10-03T10:00:00Z', status: 'pending' }),
		order({ createdAt: '2026-10-04T10:00:00Z', status: 'completed' })
	];
	const series = buildMonthlySeries(orders, 'UTC', '2026-10', 3);

	it('returns every month in the window, including empty ones, oldest first', () => {
		expect(series.map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10']);
		expect(series[0]).toMatchObject({ orders: 0, revenue: 0, cancellationRate: 0 });
	});
	it('counts orders by status and only completed orders as revenue', () => {
		expect(series[1]).toMatchObject({ orders: 2, completed: 1, cancelled: 1, revenue: 1000, cancellationRate: 50 });
		expect(series[2]).toMatchObject({ orders: 3, completed: 2, pending: 1, revenue: 3000, avgOrderValue: 1500 });
	});
});

describe('percentChange', () => {
	it('computes growth and decline', () => {
		expect(percentChange(150, 100)).toBe(50);
		expect(percentChange(50, 100)).toBe(-50);
	});
	it('is null when there is nothing to compare with, 0 when both are 0', () => {
		expect(percentChange(10, 0)).toBeNull();
		expect(percentChange(0, 0)).toBe(0);
	});
});

describe('monthToDate', () => {
	it('compares the same days of this and last month', () => {
		const orders = [
			order({ createdAt: '2026-09-03T10:00:00Z' }), // last month, day 3  -> counted
			order({ createdAt: '2026-09-25T10:00:00Z' }), // last month, day 25 -> after day 14, not counted
			order({ createdAt: '2026-10-05T10:00:00Z' }) // this month
		];
		const r = monthToDate(orders, 'UTC', new Date('2026-10-14T12:00:00Z'));
		expect(r.day).toBe(14);
		expect(r.previous).toEqual({ orders: 1, revenue: 1000 });
		expect(r.current).toEqual({ orders: 1, revenue: 1000 });
	});
});

describe('summarizeReviews', () => {
	const reviews = [
		{ productId: 'a', rating: 5, status: 'approved' },
		{ productId: 'a', rating: 4, status: 'approved' },
		{ productId: 'b', rating: 2, status: 'approved' },
		{ productId: 'b', rating: 1, status: 'pending' }, // pending: not in the stats
		{ productId: 'c', rating: 5, status: 'hidden' } // hidden: not in the stats
	];
	const s = summarizeReviews(reviews);
	it('counts only approved reviews in the rating figures', () => {
		expect(s.total).toBe(3);
		expect(s.pending).toBe(1);
		expect(s.average).toBeCloseTo(11 / 3);
		expect(s.distribution.find((d) => d.stars === 5)?.count).toBe(1);
	});
	it('ranks products', () => {
		expect(s.bestProducts[0].productId).toBe('a');
		expect(s.worstProducts[0].productId).toBe('b');
	});
	it('handles no reviews', () => {
		expect(summarizeReviews([])).toMatchObject({ total: 0, average: 0 });
	});
});

describe('csv', () => {
	it('escapes quotes, commas and spreadsheet formulas', () => {
		expect(csvCell('Ali, Khan')).toBe('"Ali, Khan"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
		expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
	});
	it('builds a file with a total row', () => {
		const csv = completedOrdersCsv([
			{ orderNumber: 'ORD-1', date: '2026-10-02', customerName: 'Ali', amount: 1000 },
			{ orderNumber: 'ORD-2', date: '2026-10-03', customerName: 'Sara', amount: 500.5 }
		]);
		expect(csv.split('\r\n')[0]).toBe('Order,Date,Customer,Amount');
		expect(csv).toContain('ORD-2,2026-10-03,Sara,500.50');
		expect(csv).toContain(',,Total,1500.50');
	});
});
