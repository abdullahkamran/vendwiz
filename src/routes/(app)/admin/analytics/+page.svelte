<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const RANGES = [
		{ label: 'Last 7 days', value: '7d' },
		{ label: 'Last 30 days', value: '30d' },
		{ label: 'Last 90 days', value: '90d' },
		{ label: 'All time', value: 'all' },
		{ label: 'Custom', value: 'custom' }
	];

	let showCustom = $derived(data.range === 'custom');

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
		dispatched: '#6366f1',
		completed: '#10b981',
		cancelled: '#ef4444'
	};
</script>

<div class="p-6 max-w-7xl mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Analytics</h1>

		<!-- Range selector -->
		<form method="GET" class="flex items-center gap-3">
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
			<button type="submit" class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
				Apply
			</button>
		</form>
	</div>

	<!-- Stat cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Total Orders</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">{data.totalOrders}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Total Revenue</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">PKR {fmt(data.totalRevenue)}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Avg Order Value</p>
			<p class="text-3xl font-bold text-gray-900 mt-1">PKR {fmt(data.avgOrderValue)}</p>
		</div>
		<div class="bg-white shadow rounded-lg p-5">
			<p class="text-sm text-gray-500">Pending Orders</p>
			<p class="text-3xl font-bold text-amber-600 mt-1">{data.pendingOrders}</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

		<!-- Orders over time (bar chart) -->
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Orders Over Time</h2>
			{#if data.ordersByDay.length > 0}
				<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full">
					{#each data.ordersByDay as d, i}
						<rect
							x={barX(i)}
							y={barY(d.count)}
							width={barW(i)}
							height={barH(d.count)}
							fill="#6366f1"
							rx="2"
						/>
					{/each}
					<!-- x-axis labels (first and last) -->
					{#if data.ordersByDay.length > 0}
						<text x={chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280">
							{data.ordersByDay[0].date}
						</text>
						<text
							x={chartWidth - chartPad}
							y={chartHeight - 4}
							font-size="10"
							fill="#6b7280"
							text-anchor="end"
						>
							{data.ordersByDay[data.ordersByDay.length - 1].date}
						</text>
					{/if}
				</svg>
			{:else}
				<p class="text-sm text-gray-500 py-8 text-center">No orders in this period.</p>
			{/if}
		</div>

		<!-- Revenue over time (line chart) -->
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
			{#if data.ordersByDay.length > 1}
				<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full">
					<polyline
						points={linePoints()}
						fill="none"
						stroke="#10b981"
						stroke-width="2"
					/>
					{#if data.ordersByDay.length > 0}
						<text x={chartPad} y={chartHeight - 4} font-size="10" fill="#6b7280">
							{data.ordersByDay[0].date}
						</text>
						<text
							x={chartWidth - chartPad}
							y={chartHeight - 4}
							font-size="10"
							fill="#6b7280"
							text-anchor="end"
						>
							{data.ordersByDay[data.ordersByDay.length - 1].date}
						</text>
					{/if}
				</svg>
			{:else}
				<p class="text-sm text-gray-500 py-8 text-center">Not enough data to plot.</p>
			{/if}
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
								<td class="py-2 text-right font-medium">PKR {fmt(p.revenue)}</td>
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
								<a href="/admin/products/{p.id}/edit" class="text-indigo-600 hover:text-indigo-900">
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
