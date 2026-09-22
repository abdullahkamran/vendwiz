<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { DiscountCode } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function getStatus(d: DiscountCode): { label: string; cls: string } {
		if (!d.isActive) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-600' };
		if (d.expiresAt && new Date(d.expiresAt) < new Date())
			return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
		return { label: 'Active', cls: 'bg-green-100 text-green-700' };
	}

	function formatDate(d: Date | null | undefined): string {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<div class="max-w-[900px]">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-[--color-text]">Discount Codes</h1>
		<a
			href="/admin/discounts/new"
			class="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
		>
			+ New Discount
		</a>
	</div>

	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	{#if data.discounts.length === 0}
		<div class="border border-dashed border-[--color-border] rounded-xl p-12 text-center">
			<p class="text-[--color-text-muted] mb-3">No discount codes yet</p>
			<a
				href="/admin/discounts/new"
				class="inline-flex px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
			>
				Create your first discount
			</a>
		</div>
	{:else}
		<div class="border border-[--color-border] rounded-xl overflow-x-auto bg-[--color-surface]">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[--color-border] bg-[--color-surface-2]">
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Code</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Type</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Value</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Min Order</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Usage</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Status</th>
						<th class="text-left px-4 py-3 font-semibold text-[--color-text]">Expires</th>
						<th class="text-right px-4 py-3 font-semibold text-[--color-text]">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.discounts as d (d.id)}
						{@const status = getStatus(d)}
						<tr class="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-2] transition-colors">
							<td class="px-4 py-3 font-mono font-semibold">{d.code}</td>
							<td class="px-4 py-3 capitalize text-[--color-text-muted]">{d.type}</td>
							<td class="px-4 py-3">
								{d.type === 'percentage'
									? `${parseFloat(d.value)}%`
									: `Rs. ${parseFloat(d.value).toLocaleString()}`}
							</td>
							<td class="px-4 py-3 text-[--color-text-muted]">
								{d.minOrderAmount ? `Rs. ${parseFloat(d.minOrderAmount).toLocaleString()}` : '—'}
							</td>
							<td class="px-4 py-3 text-[--color-text-muted]">
								{d.usageCount}{d.usageLimit ? `/${d.usageLimit}` : ''}
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium {status.cls}">
									{status.label}
								</span>
							</td>
							<td class="px-4 py-3 text-[--color-text-muted]">{formatDate(d.expiresAt)}</td>
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-2">
									<!-- Toggle active -->
									<form method="POST" action="?/toggleDiscount" use:enhance>
										<input type="hidden" name="id" value={d.id} />
										<input type="hidden" name="isActive" value={String(d.isActive)} />
										<button
											type="submit"
											class="text-xs px-2 py-1 border border-[--color-border] rounded hover:bg-[--color-surface-2] transition-colors"
											title="{d.isActive ? 'Deactivate' : 'Activate'}"
										>
											{d.isActive ? 'Deactivate' : 'Activate'}
										</button>
									</form>

									<a
										href="/admin/discounts/{d.id}"
										class="text-xs px-2 py-1 border border-[--color-border] rounded hover:bg-[--color-surface-2] transition-colors"
									>
										Edit
									</a>

									<!-- Delete -->
									<form
										method="POST"
										action="?/deleteDiscount"
										use:enhance
										onsubmit={(e) => {
											if (!confirm(`Delete discount code ${d.code}?`)) e.preventDefault();
										}}
									>
										<input type="hidden" name="id" value={d.id} />
										<button
											type="submit"
											class="text-xs px-2 py-1 border border-red-200 rounded text-red-600 hover:bg-red-50 transition-colors"
										>
											Delete
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
