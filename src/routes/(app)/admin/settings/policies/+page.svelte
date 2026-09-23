<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { StorePolicy } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const policyTypes = [
		{ id: 'return_refund', label: 'Return & Refund' },
		{ id: 'shipping', label: 'Shipping Info' },
		{ id: 'terms', label: 'Terms of Service' },
		{ id: 'faq', label: 'FAQ' }
	];

	let activeTab = $state('return_refund');
	let saving = $state(false);

	function getPolicy(type: string): StorePolicy | undefined {
		return data.policies.find((p: StorePolicy) => p.type === type);
	}

	// Per-tab form state
	let titles: Record<string, string> = $state(
		Object.fromEntries(
			policyTypes.map((t) => {
				const p = getPolicy(t.id);
				return [t.id, p?.title ?? t.label];
			})
		)
	);

	let contents: Record<string, string> = $state(
		Object.fromEntries(
			policyTypes.map((t) => {
				const p = getPolicy(t.id);
				return [t.id, p?.content ?? ''];
			})
		)
	);
</script>

{#if form?.error}
	<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
		{form.error}
	</div>
{/if}
{#if form?.success}
	<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
		Policy saved successfully.
	</div>
{/if}

<section class="border border-[--color-border] rounded-xl bg-[--color-surface] overflow-hidden">
	<!-- Tab strip -->
	<div class="flex border-b border-[--color-border] overflow-x-auto">
		{#each policyTypes as pt}
			<button
				type="button"
				onclick={() => (activeTab = pt.id)}
				class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px {activeTab === pt.id
					? 'border-[--color-accent] text-[--color-accent]'
					: 'border-transparent text-[--color-text-muted] hover:text-[--color-text]'}"
			>
				{pt.label}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	{#each policyTypes as pt}
		{#if activeTab === pt.id}
			<form
				method="POST"
				action="?/savePolicy"
				use:enhance={() => {
					saving = true;
					return async ({ update }) => {
						await update();
						saving = false;
					};
				}}
				class="p-6"
			>
				<input type="hidden" name="type" value={pt.id} />

				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-[--color-text] mb-1" for="title-{pt.id}">
							Title
						</label>
						<input
							id="title-{pt.id}"
							name="title"
							type="text"
							bind:value={titles[pt.id]}
							class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
							placeholder="{pt.label} Policy"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-[--color-text] mb-1" for="content-{pt.id}">
							Content
						</label>
						<textarea
							id="content-{pt.id}"
							name="content"
							rows="12"
							bind:value={contents[pt.id]}
							class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-accent] resize-y"
							placeholder="Write your {pt.label.toLowerCase()} policy here…"
						></textarea>
						<p class="text-xs text-[--color-text-muted] mt-1">Markdown is supported (e.g. **bold**, _italic_, # Heading).</p>
					</div>
				</div>

				<div class="flex justify-end mt-4">
					<button
						type="submit"
						disabled={saving}
						class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save {pt.label}'}
					</button>
				</div>
			</form>
		{/if}
	{/each}
</section>
