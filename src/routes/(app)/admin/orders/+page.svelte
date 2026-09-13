<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const STATUSES = ['all', 'pending', 'processing', 'dispatched', 'completed', 'cancelled'];

	const STATUS_COLORS: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-800',
		processing: 'bg-blue-100 text-blue-800',
		dispatched: 'bg-indigo-100 text-indigo-800',
		completed: 'bg-green-100 text-green-800',
		cancelled: 'bg-red-100 text-red-800'
	};

	function statusColor(status: string) {
		return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
	}

	function buildUrl(overrides: Record<string, string | number>) {
		const params = new URLSearchParams({
			status: data.filters.status,
			from: data.filters.from,
			to: data.filters.to,
			search: data.filters.search,
			page: String(data.page)
		});
		for (const [k, v] of Object.entries(overrides)) {
			if (v === '' || v === undefined) {
				params.delete(k);
			} else {
				params.set(k, String(v));
			}
		}
		return `/admin/orders?${params.toString()}`;
	}
</script>

<div class="p-6 max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Orders</h1>
	</div>

	<!-- Filters -->
	<form method="GET" class="mb-6 flex flex-wrap gap-3 items-end">
		<!-- Status filter -->
		<div>
			<label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
			<select
				id="status"
				name="status"
				class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
				value={data.filters.status}
			>
				{#each STATUSES as s}
					<option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
				{/each}
			</select>
		</div>

		<!-- Date range -->
		<div>
			<label for="from" class="block text-sm font-medium text-gray-700 mb-1">From</label>
			<input
				type="date"
				id="from"
				name="from"
				value={data.filters.from}
				class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
			/>
		</div>
		<div>
			<label for="to" class="block text-sm font-medium text-gray-700 mb-1">To</label>
			<input
				type="date"
				id="to"
				name="to"
				value={data.filters.to}
				class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
			/>
		</div>

		<!-- Search -->
		<div>
			<label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
			<input
				type="text"
				id="search"
				name="search"
				value={data.filters.search}
				placeholder="Order ref or customer name"
				class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 w-56"
			/>
		</div>

		<button
			type="submit"
			class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
		>
			Filter
		</button>
		<a href="/admin/orders" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Clear</a>
	</form>

	<!-- Table -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Ref</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.orders as order}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
							{order.orderRef}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							<div>{order.customerName}</div>
							<div class="text-gray-500 text-xs">{order.customerEmail}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							PKR {order.total}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 rounded-full text-xs font-medium {statusColor(order.status)}">
								{order.status}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{new Date(order.createdAt).toLocaleDateString()}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm">
							<a
								href="/admin/orders/{order.id}"
								class="text-indigo-600 hover:text-indigo-900 font-medium"
							>
								View
							</a>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-6 py-12 text-center text-gray-500">
							No orders found.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	<div class="mt-4 flex items-center justify-between">
		<div class="text-sm text-gray-700">
			Page {data.page}
		</div>
		<div class="flex gap-2">
			{#if data.hasPrev}
				<a
					href={buildUrl({ page: data.page - 1 })}
					class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
				>
					← Previous
				</a>
			{/if}
			{#if data.hasNext}
				<a
					href={buildUrl({ page: data.page + 1 })}
					class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
				>
					Next →
				</a>
			{/if}
		</div>
	</div>
</div>
