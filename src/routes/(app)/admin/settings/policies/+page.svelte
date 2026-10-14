<script lang="ts">
	import { enhance } from '$app/forms';
	import MarkdownEditor from '$lib/components/admin/MarkdownEditor.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import type { PageData, ActionData } from './$types';
	import type { StorePolicy } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const policyTypes = [
		{ id: 'about', label: 'About Us' },
		{ id: 'return_refund', label: 'Return & Refund' },
		{ id: 'shipping', label: 'Shipping Info' },
		{ id: 'terms', label: 'Terms of Service' },
		{ id: 'faq', label: 'FAQ' }
	];

	let activeTab = $state('about');
	let saving = $state(false);
	// Tab the user clicked while the current one had unsaved changes (waiting for their answer)
	let pendingTab = $state<string | null>(null);

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

	// Saved values derived from server data — update after each save without resetting user input
	const savedTitles: Record<string, string> = $derived(
		Object.fromEntries(
			policyTypes.map((t) => {
				const p = data.policies.find((pp: StorePolicy) => pp.type === t.id);
				return [t.id, p?.title ?? t.label];
			})
		)
	);
	const savedContents: Record<string, string> = $derived(
		Object.fromEntries(
			policyTypes.map((t) => {
				const p = data.policies.find((pp: StorePolicy) => pp.type === t.id);
				return [t.id, p?.content ?? ''];
			})
		)
	);
</script>

<section class="border border-[--color-border] rounded-xl bg-[--color-surface] overflow-hidden">
	<!-- Tab strip -->
	<div class="flex border-b border-[--color-border] overflow-x-auto">
		{#each policyTypes as pt}
			<button
				type="button"
				onclick={() => {
					if (activeTab === pt.id) return;
					if (
						titles[activeTab].trim() !== savedTitles[activeTab].trim() ||
						contents[activeTab].trim() !== savedContents[activeTab].trim()
					) {
						pendingTab = pt.id; // ask first (dialog below)
						return;
					}
					activeTab = pt.id;
				}}
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
						await update({ reset: false });
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

						{#if pt.id === 'faq'}
							<!-- FAQ format guide -->
							<p class="text-xs text-[--color-text-muted] mb-2 leading-relaxed p-2 border border-[--color-border] rounded-lg bg-[--color-surface]">
								<strong>FAQ format:</strong> use <code class="bg-[--color-border] px-1 rounded">## Your question here</code> for each question heading. The lines that follow become the answer and support full markdown — bullet lists, numbered lists, bold, tables, etc. Each <code class="bg-[--color-border] px-1 rounded">##</code> heading starts a new Q&amp;A pair.
							</p>
						{/if}

						<MarkdownEditor
							id="content-{pt.id}"
							name="content"
							rows={14}
							bind:value={contents[pt.id]}
							placeholder={pt.id === 'about'
								? 'Our story, what makes your products special, how you work…'
								: `Write your ${pt.label.toLowerCase()} policy here…`}
						/>
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 mt-4">
					{#if form?.error}
						<p class="text-sm text-red-600">{form.error}</p>
					{/if}
					{#if form?.success}
						<p class="text-sm text-green-600">Policy saved successfully.</p>
					{/if}
					<button
						type="submit"
						disabled={saving}
						class="btn btn-primary"
					>
						{saving ? 'Saving…' : `Save ${pt.label}`}
					</button>
				</div>
			</form>
		{/if}
	{/each}
</section>

<ConfirmDialog
	open={pendingTab !== null}
	title="Leave this tab?"
	message="You have unsaved changes on this tab. If you leave now, they will be lost."
	confirmLabel="Leave without saving"
	cancelLabel="Keep editing"
	variant="danger"
	onconfirm={() => {
		if (pendingTab) activeTab = pendingTab;
		pendingTab = null;
	}}
	oncancel={() => (pendingTab = null)}
/>
