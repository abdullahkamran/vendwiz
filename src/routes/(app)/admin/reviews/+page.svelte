<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selected = $state<string[]>([]);
	let deleteConfirm = $state<string | null>(null);
	let deleteAllConfirm = $state(false);

	const TABS = ['all', 'pending', 'approved', 'hidden'] as const;

	function tabLabel(t: string) {
		if (t === 'pending') return 'Pending Approval';
		if (t === 'hidden') return 'Hidden';
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	function tabHref(t: string) {
		return `/admin/reviews?status=${t === 'hidden' ? 'pending' : t}`;
	}

	// Map API hidden=pending logic: "hidden" tab shows pending (not approved)
	const currentTab = $derived(data.status === 'pending' ? 'hidden' : data.status);

	function toggleAll(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		selected = checked ? data.reviews.map((r) => r.id) : [];
	}

	function toggleOne(id: string) {
		if (selected.includes(id)) {
			selected = selected.filter((x) => x !== id);
		} else {
			selected = [...selected, id];
		}
	}

	function stars(rating: number) {
		return '★'.repeat(rating) + '☆'.repeat(5 - rating);
	}
</script>

<div class="p-6 max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Reviews</h1>
	</div>

	{#if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
			Action completed successfully.
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mb-6 border-b border-gray-200">
		<nav class="-mb-px flex gap-6">
			{#each TABS as tab}
				<a
					href={tabHref(tab)}
					class="pb-3 text-sm font-medium border-b-2 transition-colors {currentTab === tab
						? 'border-indigo-600 text-indigo-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
				>
					{tabLabel(tab)}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Bulk actions -->
	{#if selected.length > 0}
		<div class="mb-4 flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
			<span class="text-sm text-indigo-700">{selected.length} selected</span>
			<form method="POST" action="?/approveAll" class="inline">
				{#each selected as id}
					<input type="hidden" name="ids" value={id} />
				{/each}
				<button type="submit" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
					Approve All
				</button>
			</form>
			<button
				type="button"
				onclick={() => (deleteAllConfirm = true)}
				class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
			>
				Delete All
			</button>
			{#if deleteAllConfirm}
				<form method="POST" action="?/deleteAll" class="inline flex items-center gap-2">
					{#each selected as id}
						<input type="hidden" name="ids" value={id} />
					{/each}
					<span class="text-sm text-red-700">Confirm delete {selected.length} reviews?</span>
					<button type="submit" class="px-3 py-1 text-sm bg-red-700 text-white rounded hover:bg-red-800">
						Yes, Delete
					</button>
					<button
						type="button"
						onclick={() => (deleteAllConfirm = false)}
						class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
					>
						Cancel
					</button>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Table -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-4 py-3">
						<input
							type="checkbox"
							onchange={toggleAll}
							checked={selected.length === data.reviews.length && data.reviews.length > 0}
							class="rounded"
						/>
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.reviews as review}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-4">
							<input
								type="checkbox"
								checked={selected.includes(review.id)}
								onchange={() => toggleOne(review.id)}
								class="rounded"
							/>
						</td>
						<td class="px-6 py-4 text-sm text-gray-900">{review.productTitle ?? '—'}</td>
						<td class="px-6 py-4 text-sm text-gray-900">{review.customerName}</td>
						<td class="px-6 py-4 text-sm text-amber-500">{stars(review.rating)}</td>
						<td class="px-6 py-4 text-sm text-gray-700 max-w-xs">
							<p class="line-clamp-2">{review.text ?? '—'}</p>
						</td>
						<td class="px-6 py-4 text-sm text-gray-500">
							{new Date(review.createdAt).toLocaleDateString()}
						</td>
						<td class="px-6 py-4">
							<span
								class="px-2 py-1 rounded-full text-xs font-medium {review.isApproved
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-800'}"
							>
								{review.isApproved ? 'Approved' : 'Hidden'}
							</span>
						</td>
						<td class="px-6 py-4 text-sm flex gap-2">
							{#if !review.isApproved}
								<form method="POST" action="?/approve">
									<input type="hidden" name="id" value={review.id} />
									<button
										type="submit"
										class="text-green-600 hover:text-green-900 font-medium"
									>
										Approve
									</button>
								</form>
							{:else}
								<form method="POST" action="?/hide">
									<input type="hidden" name="id" value={review.id} />
									<button
										type="submit"
										class="text-gray-600 hover:text-gray-900 font-medium"
									>
										Hide
									</button>
								</form>
							{/if}

							{#if deleteConfirm === review.id}
								<form method="POST" action="?/delete" class="inline flex items-center gap-1">
									<input type="hidden" name="id" value={review.id} />
									<span class="text-red-600 text-xs">Sure?</span>
									<button type="submit" class="text-red-700 font-medium hover:text-red-900">Yes</button>
									<button
										type="button"
										onclick={() => (deleteConfirm = null)}
										class="text-gray-500 hover:text-gray-700"
									>
										No
									</button>
								</form>
							{:else}
								<button
									type="button"
									onclick={() => (deleteConfirm = review.id)}
									class="text-red-600 hover:text-red-900 font-medium"
								>
									Delete
								</button>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="px-6 py-12 text-center text-gray-500">
							No reviews found.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
