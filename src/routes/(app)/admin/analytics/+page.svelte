<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const RANGES = [
		{ label: 'Last 7 days', value: '7d' },
		{ label: 'Last 30 days', value: '30d' },
		{ label: 'Last 90 days', value: '90d' },
		{ label: 'All time', value: 'all' },
		{ label: 'Custom', value: 'custom' }
	];

	let showCustom = $derived(data.range === 'custom');

	const ov = $derived(data.overview);
	const cur = $derived(data.store.currencySymbol);

	function money(n: number) {
		return `${cur} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n))}`;
	}

	/** "+12.5%" / "−8%" / "new" when there is no previous value to compare with */
	function changeText(change: number | null) {
		if (change === null) return 'new';
		const rounded = Math.abs(change) < 10 ? change.toFixed(1) : Math.round(change).toString();
		return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(Number(rounded))}%`;
	}
	/** Colour of a change chip; for "lower is better" metrics (cancellations) the colours flip. */
	function changeClass(change: number | null, lowerIsBetter = false) {
		if (change === null || change === 0) return 'bg-gray-100 text-gray-600';
		const good = lowerIsBetter ? change < 0 : change > 0;
		return good ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
	}
	function arrow(change: number | null) {
		return change === null || change === 0 ? '' : change > 0 ? '▲ ' : '▼ ';
	}

	// Revenue bar chart (12 months)
	const barChartW = 600;
	const barChartH = 220;
	const maxMonthRevenue = $derived(Math.max(1, ...ov.chartSeries.map((m) => m.revenue)));
	function monthBarH(revenue: number) {
		return ((barChartH - 50) * revenue) / maxMonthRevenue;
	}

	// Status donut
	const STATUS_ORDER = ['completed', 'dispatched', 'processing', 'pending', 'cancelled'] as const;
	const statusTotal = $derived(STATUS_ORDER.reduce((s, k) => s + ov.statusCounts[k], 0));
	const DONUT_R = 52;
	const DONUT_C = 2 * Math.PI * DONUT_R;
	const donutSegments = $derived.by(() => {
		let offset = 0;
		return STATUS_ORDER.filter((k) => ov.statusCounts[k] > 0).map((k) => {
			const len = (ov.statusCounts[k] / Math.max(1, statusTotal)) * DONUT_C;
			const seg = { status: k, len, offset };
			offset += len;
			return seg;
		});
	});

	function fmt(n: number) {
		return new Intl.NumberFormat('en-PK').format(Math.round(n));
	}

	// Simple SVG bar chart helpers
	const chartWidth = 600;
	const chartHeight = 200;
	const chartPad = 40;

	const maxCount = $derived(Math.max(1, ...data.ordersByDay.map((d) => d.count)));
	const maxRev = $derived(Math.max(1, ...data.ordersByDay.map((d) => d.revenue)));

	function barX(i: number) {
		const n = data.ordersByDay.length || 1;
		const w = (chartWidth - chartPad * 2) / n;
		return chartPad + i * w + w * 0.1;
	}

	function barW(i: number) {
		const n = data.ordersByDay.length || 1;
		const w = (chartWidth - chartPad * 2) / n;
		return w * 0.8;
	}

	function barH(count: number) {
		return ((chartHeight - chartPad) * count) / maxCount;
	}

	function barY(count: number) {
		return chartHeight - barH(count) - 20;
	}

	function linePoints() {
		if (data.ordersByDay.length === 0) return '';
		const n = data.ordersByDay.length;
		const w = (chartWidth - chartPad * 2) / n;
		return data.ordersByDay
			.map((d, i) => {
				const x = chartPad + i * w + w / 2;
				const y = chartHeight - 20 - ((chartHeight - chartPad) * d.revenue) / maxRev;
				return `${x},${y}`;
			})
			.join(' ');
	}

	const STATUS_COLORS: Record<string, string> = {
		pending: '#f59e0b',
		processing: '#3b82f6',
		dispatched: '#8b5cf6',
		completed: '#10b981',
		cancelled: '#ef4444'
	};

	// ── Chart interactivity: hover shows a tooltip, click drills in
	let hoverMonth = $state<string | null>(null);
	let hoverStatus = $state<string | null>(null);
	let hoverOrderDay = $state<number | null>(null);
	let hoverRevDay = $state<number | null>(null);

	const hoveredMonthIndex = $derived(ov.chartSeries.findIndex((m) => m.key === hoverMonth));
	const hoveredMonth = $derived(hoveredMonthIndex >= 0 ? ov.chartSeries[hoveredMonthIndex] : null);
	const hoveredMonthPrev = $derived(hoveredMonthIndex > 0 ? ov.chartSeries[hoveredMonthIndex - 1] : null);

	// The month picker and the date-range picker each keep the other's setting
	const rangeQuery = $derived(
		`range=${data.range}` + (data.range === 'custom' ? `&from=${data.customFrom}&to=${data.customTo}` : '')
	);

	function pickMonth(key: string) {
		if (key === ov.selectedMonth) return;
		goto(`?month=${key}&months=${ov.tableMonths}&${rangeQuery}`, { noScroll: true, keepFocus: true });
	}
	/** Keeps a tooltip inside the card: horizontal centre as a percentage, clamped near the edges */
	function tipLeft(centerPct: number) {
		return Math.min(86, Math.max(14, centerPct));
	}

	// Date-range charts: point geometry shared by the line, its dots and the hover guide
	function lineX(i: number) {
		const w = (chartWidth - chartPad * 2) / (data.ordersByDay.length || 1);
		return chartPad + i * w + w / 2;
	}
	function lineY(rev: number) {
		return chartHeight - 20 - ((chartHeight - chartPad) * rev) / maxRev;
	}
	function areaPath() {
		const n = data.ordersByDay.length;
		if (n < 2) return '';
		const base = chartHeight - 20;
		const pts = data.ordersByDay.map((d, i) => `${lineX(i)},${lineY(d.revenue)}`);
		return `M ${lineX(0)},${base} L ${pts.join(' L ')} L ${lineX(n - 1)},${base} Z`;
	}
</script>

<div class="p-6 max-w-7xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

	<!-- ═══════════════ Overview: calendar months ═══════════════ -->
	<section class="mb-12">
		<div class="flex flex-wrap items-end justify-between gap-3 mb-5">
			<form method="GET" autocomplete="off" class="flex items-center gap-2">
				<label for="ov-month" class="text-sm text-gray-600">Month</label>
				<!-- Re-created whenever the loaded month changes, and autocomplete is off, so the browser can't
				     restore an old choice on reload / back and show a month that isn't the one on screen. -->
				{#key ov.selectedMonth}
					<select id="ov-month" name="month" autocomplete="off" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="text-sm">
						{#each ov.monthOptions as m (m.key)}
							<option value={m.key} selected={m.key === ov.selectedMonth}>{m.label}{m.key === ov.monthOptions[0].key ? ' (current)' : ''}</option>
						{/each}
					</select>
				{/key}
				<input type="hidden" name="months" value={ov.tableMonths} autocomplete="off" />
				<input type="hidden" name="range" value={data.range} autocomplete="off" />
				{#if data.range === 'custom'}
					<input type="hidden" name="from" value={data.customFrom} />
					<input type="hidden" name="to" value={data.customTo} />
				{/if}
				{#if !ov.isCurrentMonth}
					<a href="/admin/analytics?months={ov.tableMonths}&{rangeQuery}" class="btn btn-secondary btn-sm">Back to current month</a>
				{/if}
			</form>
		</div>

		<!-- Money generated: all time, and this calendar month -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
			<div class="rounded-lg p-6 text-white" style="background: linear-gradient(135deg, #4f46e5, #06b6d4);">
				<p class="text-sm text-white/80">Total generated so far</p>
				<p class="text-3xl font-bold mt-1">{money(ov.totals.allTime)}</p>
				<p class="text-xs text-white/80 mt-2">from {ov.totals.allTimeOrders} completed {ov.totals.allTimeOrders === 1 ? 'order' : 'orders'}, all time</p>
			</div>
			<div class="rounded-lg p-6 text-white" style="background: linear-gradient(135deg, #059669, #84cc16);">
				<p class="text-sm text-white/80">Generated this month · {ov.totals.thisMonthLabel}</p>
				<p class="text-3xl font-bold mt-1">{money(ov.totals.thisMonth)}</p>
				<p class="text-xs text-white/80 mt-2">
					{ov.totals.thisMonthOrders} completed {ov.totals.thisMonthOrders === 1 ? 'order' : 'orders'}
					· {arrow(ov.totals.thisMonthChange)}{changeText(ov.totals.thisMonthChange)} vs same days of {ov.totals.previousMonthLabel}
				</p>
			</div>
		</div>

		<!-- Headline cards, each compared with the previous month -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
			{#each [
				{ label: 'Revenue', value: money(ov.kpis.revenue.value), change: ov.kpis.revenue.change, lowerIsBetter: false },
				{ label: 'Orders placed', value: String(ov.kpis.orders.value), change: ov.kpis.orders.change, lowerIsBetter: false },
				{ label: 'Average order value', value: money(ov.kpis.avgOrderValue.value), change: ov.kpis.avgOrderValue.change, lowerIsBetter: false },
				{ label: 'Cancellation rate', value: `${ov.kpis.cancellationRate.value.toFixed(1)}%`, change: ov.kpis.cancellationRate.change, lowerIsBetter: true }
			] as card}
				<div class="bg-white shadow rounded-lg p-5">
					<p class="text-sm text-gray-500">{card.label}</p>
					<p class="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
					<p class="mt-2 text-xs">
						<span class="inline-flex px-1.5 py-0.5 rounded font-medium {changeClass(card.change, card.lowerIsBetter)}">{arrow(card.change)}{changeText(card.change)}</span>
						<span class="text-gray-500 ml-1">vs {ov.previousLabel}</span>
					</p>
				</div>
			{/each}
		</div>

		{#if ov.todayComparison}
			<p class="text-sm text-gray-700 bg-white border border-[var(--color-border)] rounded-lg px-4 py-3 mb-6">
				<strong>So far this month</strong> (days 1–{ov.todayComparison.day}): revenue {money(ov.todayComparison.current.revenue)}
				vs {money(ov.todayComparison.previous.revenue)} over the same days of {ov.todayComparison.previousLabel}
				<span class="inline-flex px-1.5 py-0.5 rounded text-xs font-medium ml-1 {changeClass(ov.todayComparison.revenueChange)}">{arrow(ov.todayComparison.revenueChange)}{changeText(ov.todayComparison.revenueChange)}</span>
				· orders {ov.todayComparison.current.orders} vs {ov.todayComparison.previous.orders}.
			</p>
		{/if}

		<h2 class="text-xl mb-4">Charts</h2>

		<div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
			<!-- Order status donut -->
			<div class="bg-white shadow rounded-lg p-6 lg:col-span-2">
				<h2 class="text-lg mb-4">Orders by status · {ov.selectedLabel}</h2>
				{#if statusTotal > 0}
					<div class="flex items-center gap-6">
						<svg viewBox="0 0 140 140" class="w-36 h-36 flex-shrink-0" role="img" aria-label="Orders by status">
							<g transform="rotate(-90 70 70)">
								<circle cx="70" cy="70" r={DONUT_R} fill="none" stroke="#f3f4f6" stroke-width="18" />
								{#each donutSegments as seg}
									<circle
										role="link"
										tabindex="0"
										aria-label="{seg.status}: {ov.statusCounts[seg.status]} orders"
										class="cursor-pointer outline-none transition-all"
										cx="70" cy="70" r={DONUT_R} fill="none"
										stroke={STATUS_COLORS[seg.status]}
										stroke-width={hoverStatus === seg.status ? 24 : 18}
										opacity={hoverStatus && hoverStatus !== seg.status ? 0.35 : 1}
										stroke-dasharray="{seg.len} {DONUT_C - seg.len}"
										stroke-dashoffset={-seg.offset}
										onpointerenter={() => (hoverStatus = seg.status)}
										onpointerleave={() => (hoverStatus = null)}
										onfocus={() => (hoverStatus = seg.status)}
										onblur={() => (hoverStatus = null)}
										onclick={() => goto(`/admin/orders?status=${seg.status}`)}
										onkeydown={(e) => e.key === 'Enter' && goto(`/admin/orders?status=${seg.status}`)}
									/>
								{/each}
							</g>
							{#if hoverStatus}
								<text x="70" y="64" text-anchor="middle" font-size="22" font-weight="700" fill={STATUS_COLORS[hoverStatus]}>{ov.statusCounts[hoverStatus as keyof typeof ov.statusCounts]}</text>
								<text x="70" y="80" text-anchor="middle" font-size="9" fill="#374151" class="capitalize">{hoverStatus}</text>
								<text x="70" y="92" text-anchor="middle" font-size="9" fill="#6b7280">{Math.round((ov.statusCounts[hoverStatus as keyof typeof ov.statusCounts] / Math.max(1, statusTotal)) * 100)}%</text>
							{:else}
								<text x="70" y="68" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">{statusTotal}</text>
								<text x="70" y="86" text-anchor="middle" font-size="9" fill="#6b7280">orders</text>
							{/if}
						</svg>
						<ul class="space-y-1 text-sm flex-1">
							{#each STATUS_ORDER as k}
								<li>
									<a
										href="/admin/orders?status={k}"
										class="flex items-center gap-2 rounded px-2 py-1 transition-colors {hoverStatus === k ? 'bg-gray-100' : ''}"
										onpointerenter={() => (hoverStatus = k)}
										onpointerleave={() => (hoverStatus = null)}
										onfocus={() => (hoverStatus = k)}
										onblur={() => (hoverStatus = null)}
									>
										<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{STATUS_COLORS[k]}"></span>
										<span class="flex-1 capitalize text-gray-700">{k}</span>
										<span class="font-medium text-gray-900">{ov.statusCounts[k]}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="text-sm text-gray-500 py-8 text-center">No orders in {ov.selectedLabel}.</p>
				{/if}
			</div>

			<!-- Revenue, last 12 months -->
			<div class="bg-white shadow rounded-lg p-6 lg:col-span-3">
				<h2 class="text-lg mb-4">Revenue · last 12 months</h2>
				<div class="relative">
					<svg viewBox="0 0 {barChartW} {barChartH}" class="w-full" role="group" aria-label="Monthly revenue — select a month">
						<defs>
							<linearGradient id="monthBar" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#6366f1" />
								<stop offset="100%" stop-color="#06b6d4" />
							</linearGradient>
						</defs>
						{#each [0.25, 0.5, 0.75, 1] as g}
							<line x1="0" x2={barChartW} y1={barChartH - 30 - (barChartH - 50) * g} y2={barChartH - 30 - (barChartH - 50) * g} stroke="#f3f4f6" />
						{/each}
						<line x1="0" x2={barChartW} y1={barChartH - 30} y2={barChartH - 30} stroke="#e5e7eb" />
						{#each ov.chartSeries as m, i}
							{@const w = barChartW / 12}
							{@const h = monthBarH(m.revenue)}
							{@const active = m.key === ov.selectedMonth || m.key === hoverMonth}
							<g
								role="button"
								tabindex="0"
								aria-label="{m.label}: revenue {money(m.revenue)}, {m.completed} completed orders"
								class="cursor-pointer outline-none"
								onpointerenter={() => (hoverMonth = m.key)}
								onpointerleave={() => (hoverMonth = null)}
								onfocus={() => (hoverMonth = m.key)}
								onblur={() => (hoverMonth = null)}
								onclick={() => pickMonth(m.key)}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && pickMonth(m.key)}
							>
								<!-- full-height hit area so thin or empty months are easy to target -->
								<rect x={i * w} y="0" width={w} height={barChartH - 20} fill="transparent" />
								<rect
									x={i * w + w * 0.15} y={barChartH - 30 - h} width={w * 0.7} height={Math.max(h, m.revenue > 0 ? 2 : 0)} rx="3"
									fill="url(#monthBar)" opacity={active ? 1 : 0.5}
								/>
								<text x={i * w + w / 2} y={barChartH - 12} text-anchor="middle" font-size="10" fill={m.key === ov.selectedMonth ? '#4f46e5' : '#6b7280'} font-weight={active ? '700' : '400'}>{m.shortLabel.split(' ')[0]}</text>
							</g>
						{/each}
					</svg>
					{#if hoveredMonth}
						<div class="absolute top-0 z-10 pointer-events-none -translate-x-1/2 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap" style="left:{tipLeft(((hoveredMonthIndex + 0.5) / 12) * 100)}%">
							<p class="font-semibold">{hoveredMonth.label}</p>
							<p>Revenue {money(hoveredMonth.revenue)}</p>
							<p>{hoveredMonth.orders} placed · {hoveredMonth.completed} completed · {hoveredMonth.cancelled} cancelled</p>
							{#if hoveredMonthPrev}
								{@const ch = hoveredMonthPrev.revenue === 0 ? (hoveredMonth.revenue === 0 ? 0 : null) : ((hoveredMonth.revenue - hoveredMonthPrev.revenue) / hoveredMonthPrev.revenue) * 100}
								<p class="text-gray-300">{arrow(ch)}{changeText(ch)} vs {hoveredMonthPrev.label}</p>
							{/if}
							<p class="text-gray-400 mt-1">{hoveredMonth.key === ov.selectedMonth ? 'Selected month' : 'Click to view this month'}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Daily trend charts: these two follow the date range chosen here -->
		<div class="flex flex-wrap items-center justify-between gap-3 mb-3">
			<p class="text-sm text-gray-600">Daily trend · also sets the range of the report further down</p>
		<!-- Range selector -->
		<form method="GET" class="flex items-center gap-3">
			<input type="hidden" name="month" value={ov.selectedMonth} />
			<input type="hidden" name="months" value={ov.tableMonths} />
			<select
				name="range"
				class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
				value={data.range}
			>
				{#each RANGES as r}
					<option value={r.value}>{r.label}</option>
				{/each}
			</select>
			{#if showCustom}
				<input type="date" name="from" value={data.customFrom} class="rounded-md border-gray-300 shadow-sm text-sm" />
				<input type="date" name="to" value={data.customTo} class="rounded-md border-gray-300 shadow-sm text-sm" />
			{/if}
			<button type="submit" class="btn btn-primary">
				Apply
			</button>
		</form>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

		<!-- Orders over time (bar chart) -->
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Orders Over Time</h2>
			{#if data.ordersByDay.length > 0}
				<div class="relative">
					<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full" role="img" aria-label="Orders over time">
						<defs>
							<linearGradient id="ordersBar" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#3b82f6" />
								<stop offset="100%" stop-color="#8b5cf6" />
							</linearGradient>
						</defs>
						{#each data.ordersByDay as d, i}
							<rect
								x={barX(i)}
								y={barY(d.count)}
								width={barW(i)}
								height={barH(d.count)}
								fill="url(#ordersBar)"
								opacity={hoverOrderDay === null || hoverOrderDay === i ? 1 : 0.45}
								rx="2"
							/>
							<!-- full-height hover target for each day -->
							<rect
								x={barX(i) - barW(i) * 0.125} y="0" width={barW(i) * 1.25} height={chartHeight - 20} fill="transparent"
								role="presentation"
								onpointerenter={() => (hoverOrderDay = i)}
								onpointerleave={() => (hoverOrderDay = null)}
							/>
						{/each}
						<text x={chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280">{data.ordersByDay[0].date}</text>
						<text x={chartWidth - chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280" text-anchor="end">{data.ordersByDay[data.ordersByDay.length - 1].date}</text>
					</svg>
					{#if hoverOrderDay !== null}
						{@const d = data.ordersByDay[hoverOrderDay]}
						<div class="absolute top-0 z-10 pointer-events-none -translate-x-1/2 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap" style="left:{tipLeft(((barX(hoverOrderDay) + barW(hoverOrderDay) / 2) / chartWidth) * 100)}%">
							<p class="font-semibold">{d.date}</p>
							<p>{d.count} {d.count === 1 ? 'order' : 'orders'}</p>
							<p class="text-gray-300">Revenue {money(d.revenue)}</p>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-gray-500 py-8 text-center">No orders in this period.</p>
			{/if}
		</div>

		<!-- Revenue over time (line chart) -->
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
			{#if data.ordersByDay.length > 1}
				<div class="relative">
					<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full" role="img" aria-label="Revenue over time">
						<defs>
							<linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
								<stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
							</linearGradient>
						</defs>
						<path d={areaPath()} fill="url(#revArea)" />
						<polyline points={linePoints()} fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
						{#each data.ordersByDay as d, i}
							{#if hoverRevDay === i}
								<line x1={lineX(i)} x2={lineX(i)} y1="0" y2={chartHeight - 20} stroke="#a7f3d0" stroke-dasharray="3 3" />
								<circle cx={lineX(i)} cy={lineY(d.revenue)} r="5" fill="#10b981" stroke="#fff" stroke-width="2" />
							{/if}
							<rect
								x={lineX(i) - (chartWidth - chartPad * 2) / data.ordersByDay.length / 2} y="0"
								width={(chartWidth - chartPad * 2) / data.ordersByDay.length} height={chartHeight - 20} fill="transparent"
								role="presentation"
								onpointerenter={() => (hoverRevDay = i)}
								onpointerleave={() => (hoverRevDay = null)}
							/>
						{/each}
						<text x={chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280">{data.ordersByDay[0].date}</text>
						<text x={chartWidth - chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280" text-anchor="end">{data.ordersByDay[data.ordersByDay.length - 1].date}</text>
					</svg>
					{#if hoverRevDay !== null}
						{@const d = data.ordersByDay[hoverRevDay]}
						<div class="absolute top-0 z-10 pointer-events-none -translate-x-1/2 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap" style="left:{tipLeft((lineX(hoverRevDay) / chartWidth) * 100)}%">
							<p class="font-semibold">{d.date}</p>
							<p>Revenue {money(d.revenue)}</p>
							<p class="text-gray-300">{d.count} {d.count === 1 ? 'order' : 'orders'}</p>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-gray-500 py-8 text-center">Not enough data to plot.</p>
			{/if}
		</div>
	</div>

		<!-- Completed orders for the month -->
		<div class="bg-white shadow rounded-lg p-6 mb-6">
			<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
				<div>
					<h2 class="text-lg">Completed orders · {ov.selectedLabel}</h2>
					<p class="text-sm text-gray-500 mt-0.5">{ov.completedOrders.length} orders · total {money(ov.completedTotal)}</p>
				</div>
				{#if ov.completedOrders.length > 0}
					<a href="/admin/analytics/export?month={ov.selectedMonth}" class="btn btn-secondary btn-sm" download>Export CSV</a>
				{/if}
			</div>
			{#if ov.completedOrders.length > 0}
				<div class="overflow-x-auto max-h-96 overflow-y-auto">
					<table class="min-w-full text-sm">
						<thead>
							<tr class="text-left text-gray-500 border-b">
								<th class="pb-2 font-medium">Order</th>
								<th class="pb-2 font-medium">Date</th>
								<th class="pb-2 font-medium">Customer</th>
								<th class="pb-2 font-medium text-right">Amount</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100">
							{#each ov.completedOrders as o (o.id)}
								<tr>
									<td class="py-2"><a href="/admin/orders/{o.id}" class="text-gray-900 font-medium hover:underline">#{o.orderNumber}</a></td>
									<td class="py-2 text-gray-600">{o.date}</td>
									<td class="py-2 text-gray-600">{o.customerName}</td>
									<td class="py-2 text-right font-medium">{money(o.amount)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-sm text-gray-500 py-6 text-center">No completed orders in {ov.selectedLabel}.</p>
			{/if}
		</div>

		<!-- Month by month -->
		<div class="bg-white shadow rounded-lg p-6 mb-6">
			<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
				<h2 class="text-lg">Month by month</h2>
				<div class="flex gap-1.5">
					{#each [3, 6, 12] as n}
						<a
							href="?month={ov.selectedMonth}&months={n}&{rangeQuery}"
							class="btn btn-sm {ov.tableMonths === n ? 'btn-primary' : 'btn-secondary'}"
						>{n} months</a>
					{/each}
				</div>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full text-sm">
					<thead>
						<tr class="text-left text-gray-500 border-b">
							<th class="pb-2 font-medium">Month</th>
							<th class="pb-2 font-medium text-right">Orders</th>
							<th class="pb-2 font-medium text-right">Completed</th>
							<th class="pb-2 font-medium text-right">Cancelled</th>
							<th class="pb-2 font-medium text-right">Revenue</th>
							<th class="pb-2 font-medium text-right">vs previous</th>
							<th class="pb-2 font-medium text-right">Avg order</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each ov.tableSeries as m, i}
							{@const prev = ov.tableSeries[i + 1]}
							{@const change = prev ? (prev.revenue === 0 ? (m.revenue === 0 ? 0 : null) : ((m.revenue - prev.revenue) / prev.revenue) * 100) : undefined}
							<tr class={m.key === ov.selectedMonth ? 'bg-gray-50' : ''}>
								<td class="py-2 font-medium text-gray-900">{m.label}</td>
								<td class="py-2 text-right">{m.orders}</td>
								<td class="py-2 text-right">{m.completed}</td>
								<td class="py-2 text-right">{m.cancelled}</td>
								<td class="py-2 text-right font-medium">{money(m.revenue)}</td>
								<td class="py-2 text-right">
									{#if change !== undefined}
										<span class="inline-flex px-1.5 py-0.5 rounded text-xs font-medium {changeClass(change)}">{arrow(change)}{changeText(change)}</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="py-2 text-right text-gray-600">{money(m.avgOrderValue)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Reviews summary -->
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
				<h2 class="text-lg">Reviews</h2>
				<a href="/admin/reviews" class="btn btn-secondary btn-sm">
					Manage reviews{#if ov.reviews.pending > 0}&nbsp;· {ov.reviews.pending} awaiting approval{/if}
				</a>
			</div>
			{#if ov.reviews.total > 0}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div>
						<p class="text-4xl font-bold text-gray-900">{ov.reviews.average.toFixed(1)}<span class="text-lg text-gray-400 font-normal"> / 5</span></p>
						<p class="text-amber-500 tracking-wider mt-1" aria-hidden="true">{'★'.repeat(Math.round(ov.reviews.average))}{'☆'.repeat(5 - Math.round(ov.reviews.average))}</p>
						<p class="text-sm text-gray-500 mt-1">{ov.reviews.total} approved reviews</p>
						<p class="text-sm text-gray-500">{ov.reviews.newThisMonth} in {ov.selectedLabel} · {ov.reviews.newLastMonth} in {ov.previousLabel}</p>
					</div>
					<div class="space-y-1.5">
						{#each ov.reviews.distribution as d}
							<div class="flex items-center gap-2 text-sm">
								<span class="w-8 text-gray-600">{d.stars} ★</span>
								<div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
									<div class="h-full bg-gray-900 rounded-full" style="width:{(d.count / Math.max(1, ov.reviews.total)) * 100}%"></div>
								</div>
								<span class="w-6 text-right text-gray-600">{d.count}</span>
							</div>
						{/each}
					</div>
					<div class="text-sm space-y-4">
						<div>
							<p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Best rated</p>
							{#each ov.reviews.best as p}
								<p class="flex justify-between gap-2"><span class="truncate">{p.title}</span><span class="text-gray-600 flex-shrink-0">{p.average.toFixed(1)} ★ ({p.count})</span></p>
							{/each}
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Needs attention</p>
							{#each ov.reviews.worst as p}
								<p class="flex justify-between gap-2"><span class="truncate">{p.title}</span><span class="text-gray-600 flex-shrink-0">{p.average.toFixed(1)} ★ ({p.count})</span></p>
							{/each}
						</div>
					</div>
				</div>
				{#if ov.reviews.latest.length > 0}
					<div class="mt-6 pt-5 border-t border-[var(--color-border)]">
						<p class="text-xs uppercase tracking-wide text-gray-500 mb-3">Latest reviews</p>
						<ul class="space-y-3">
							{#each ov.reviews.latest as r}
								<li class="text-sm">
									<span class="text-amber-500" aria-hidden="true">{'★'.repeat(r.rating)}</span>
									<span class="font-medium text-gray-900 ml-1">{r.productTitle}</span>
									<span class="text-gray-500"> · {r.reviewerName} · {r.date}</span>
									{#if r.body}<p class="text-gray-600 mt-0.5">{r.body}</p>{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{:else}
				<p class="text-sm text-gray-500 py-6 text-center">No approved reviews yet.</p>
			{/if}
		</div>
	</section>

	<div class="mb-6">
		<h2 class="text-xl">Date range report</h2>
		<p class="text-sm text-gray-500 mt-1">Showing {RANGES.find((r) => r.value === data.range)?.label ?? data.range}. Change the range in the Charts section above.</p>
	</div>
	<!-- Stat cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Total Orders</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">{data.totalOrders}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Total Revenue</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">{cur} {fmt(data.totalRevenue)}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Avg Order Value</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">{cur} {fmt(data.avgOrderValue)}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Pending Orders</p>
			<p class="text-3xl font-bold text-amber-600 mt-1">{data.pendingOrders}</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

		<!-- Top products -->
		<div class="lg:col-span-2 bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
			{#if data.topProducts.length > 0}
				<table class="min-w-full text-sm">
					<thead>
						<tr class="text-left text-gray-500 border-b">
							<th class="pb-2 font-medium">Product</th>
							<th class="pb-2 font-medium text-right">Qty Sold</th>
							<th class="pb-2 font-medium text-right">Revenue</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.topProducts as p}
							<tr>
								<td class="py-2 text-gray-900">{p.title}</td>
								<td class="py-2 text-right text-gray-600">{p.qtySold}</td>
								<td class="py-2 text-right font-medium">{cur} {fmt(p.revenue)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="text-sm text-gray-500 py-4 text-center">No sales data.</p>
			{/if}
		</div>

		<!-- Status breakdown -->
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
			{#if data.statusBreakdown.length > 0}
				<div class="space-y-3">
					{#each data.statusBreakdown as s}
						<div class="flex items-center gap-3">
							<div
								class="w-3 h-3 rounded-full flex-shrink-0"
								style="background:{STATUS_COLORS[s.status] ?? '#6b7280'}"
							></div>
							<span class="flex-1 text-sm text-gray-700 capitalize">{s.status}</span>
							<span class="text-sm font-medium text-gray-900">{s.count}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-gray-500 py-4 text-center">No data.</p>
			{/if}
		</div>
	</div>

	<!-- Low stock -->
	{#if data.lowStockProducts.length > 0}
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
				⚠️ Low Stock Alerts
				<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
					{data.lowStockProducts.length}
				</span>
			</h2>
			<table class="min-w-full text-sm">
				<thead>
					<tr class="text-left text-gray-500 border-b">
						<th class="pb-2 font-medium">Product</th>
						<th class="pb-2 font-medium text-right">Stock</th>
						<th class="pb-2 font-medium text-right">Threshold</th>
						<th class="pb-2 font-medium text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.lowStockProducts as p}
						<tr>
							<td class="py-2 text-gray-900">{p.title}</td>
							<td class="py-2 text-right font-medium text-red-600">{p.stock}</td>
							<td class="py-2 text-right text-gray-500">{p.threshold}</td>
							<td class="py-2 text-right">
								<a href="/admin/products/{p.id}" class="btn btn-secondary btn-sm">
									Edit
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
