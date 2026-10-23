<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { parseVideoSource, videoSourceLabel, videoThumb } from '$lib/utils/video';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Reel = PageData['reels'][number];

	// Form state: editingId === null means "add new"
	let editingId = $state<string | null>(null);
	let productId = $state('');
	let videoUrl = $state('');
	let caption = $state('');
	let sortOrder = $state(0);
	let isPublished = $state(true);
	let saving = $state(false);
	let deleteConfirm = $state<string | null>(null);

	// Live feedback on the pasted link
	let linkSource = $derived(parseVideoSource(videoUrl));

	function resetForm() {
		editingId = null;
		productId = '';
		videoUrl = '';
		caption = '';
		sortOrder = data.reels.length;
		isPublished = true;
	}

	function startEdit(reel: Reel) {
		editingId = reel.id;
		productId = reel.productId;
		videoUrl = reel.videoUrl;
		caption = reel.caption ?? '';
		sortOrder = reel.sortOrder;
		isPublished = reel.isPublished;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	resetForm();
</script>

<div class="p-6 max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Reels</h1>
		<p class="text-sm text-gray-500 mt-1">
			Short product videos shown in the storefront Reels feed. Paste a YouTube or YouTube Shorts link and pick
			the product it shows. Reels can also be added from the product's own Reels tab. Shoppers see the price and can jump straight to the product.
		</p>
	</div>

	{#if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{form.success}</div>
	{/if}
	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{form.error}</div>
	{/if}

	<!-- Add / edit form -->
	<form
		method="POST"
		action={editingId ? '?/update' : '?/create'}
		class="bg-white shadow rounded-lg p-5 mb-8 space-y-4"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') resetForm();
			};
		}}
	>
		<h2 class="text-base font-semibold text-gray-900">{editingId ? 'Edit reel' : 'Add a reel'}</h2>
		{#if editingId}<input type="hidden" name="id" value={editingId} />{/if}

		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="reel-product">
					Product <span class="text-red-500">*</span>
				</label>
				<select
					id="reel-product"
					name="productId"
					bind:value={productId}
					required
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
				>
					<option value="" disabled>Select a product…</option>
					{#each data.products as p}
						<option value={p.id}>{p.title}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="reel-url">
					Video link <span class="text-red-500">*</span>
				</label>
				<input
					id="reel-url"
					name="videoUrl"
					type="url"
					bind:value={videoUrl}
					required
					placeholder="https://www.youtube.com/shorts/…"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
				/>
				{#if videoUrl.trim()}
					<p class="text-xs mt-1 {linkSource ? 'text-green-700' : 'text-red-600'}">
						{#if linkSource}
							✓ {videoSourceLabel(linkSource)} video detected
						{:else}
							Not a YouTube link. Use a youtube.com, youtu.be or YouTube Shorts link.
						{/if}
					</p>
				{/if}
			</div>

			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-1" for="reel-caption">Caption (optional)</label>
				<input
					id="reel-caption"
					name="caption"
					type="text"
					maxlength="300"
					bind:value={caption}
					placeholder="e.g. New colours just dropped 🔥"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="reel-order">Display order</label>
				<input
					id="reel-order"
					name="sortOrder"
					type="number"
					bind:value={sortOrder}
					class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
				/>
				<p class="text-xs text-gray-500 mt-1">Lower numbers show first.</p>
			</div>

			<label class="flex items-center gap-2 text-sm text-gray-700 self-center">
				<input type="checkbox" name="isPublished" bind:checked={isPublished} class="rounded" />
				Show on storefront
			</label>
		</div>

		<div class="flex gap-2">
			<button type="submit" class="btn btn-primary" disabled={saving}>
				{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add reel'}
			</button>
			{#if editingId}
				<button type="button" class="btn btn-secondary" onclick={resetForm}>Cancel</button>
			{/if}
		</div>
	</form>

	<!-- Reels list -->
	{#if data.reels.length === 0}
		<div class="bg-white shadow rounded-lg p-10 text-center text-sm text-gray-500">
			No reels yet. Add your first product video above.
		</div>
	{:else}
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caption</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each data.reels as reel (reel.id)}
							{@const src = parseVideoSource(reel.videoUrl)}
							{@const thumb = src ? videoThumb(src) : null}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<a href={reel.videoUrl} target="_blank" rel="noopener" class="flex items-center gap-3">
										{#if thumb}
											<img src={thumb} alt="" class="w-12 h-16 object-cover rounded bg-gray-100" />
										{:else}
											<span class="w-12 h-16 rounded bg-gray-100 flex items-center justify-center text-lg">&#9654;</span>
										{/if}
										<span class="text-xs text-gray-600">{videoSourceLabel(src)}</span>
									</a>
								</td>
								<td class="px-4 py-3 text-sm text-gray-900">{reel.productTitle ?? '—'}</td>
								<td class="px-4 py-3 text-sm text-gray-700 max-w-xs"><p class="line-clamp-2">{reel.caption ?? '—'}</p></td>
								<td class="px-4 py-3 text-sm text-gray-700">{reel.sortOrder}</td>
								<td class="px-4 py-3">
									<span
										class="px-2 py-1 rounded-full text-xs font-medium {reel.isPublished
											? 'bg-green-100 text-green-800'
											: 'bg-gray-100 text-gray-800'}"
									>
										{reel.isPublished ? 'Live' : 'Hidden'}
									</span>
								</td>
								<td class="px-4 py-3 text-sm">
									<div class="flex items-center gap-2">
										<button type="button" class="btn btn-secondary btn-sm" onclick={() => startEdit(reel)}>Edit</button>
										<form method="POST" action="?/togglePublish" use:enhance>
											<input type="hidden" name="id" value={reel.id} />
											<input type="hidden" name="publish" value={reel.isPublished ? '0' : '1'} />
											<button type="submit" class="btn btn-secondary btn-sm">{reel.isPublished ? 'Hide' : 'Publish'}</button>
										</form>
										{#if deleteConfirm === reel.id}
											<form method="POST" action="?/delete" class="flex items-center gap-1" use:enhance={() => {
												return async ({ update }) => { deleteConfirm = null; if (editingId === reel.id) resetForm(); await update(); };
											}}>
												<input type="hidden" name="id" value={reel.id} />
												<span class="text-red-600 text-xs">Sure?</span>
												<button type="submit" class="btn btn-danger btn-sm">Yes</button>
												<button type="button" class="btn btn-secondary btn-sm" onclick={() => (deleteConfirm = null)}>No</button>
											</form>
										{:else}
											<button type="button" class="btn btn-delete btn-sm" onclick={() => (deleteConfirm = reel.id)}>Delete</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
