<script lang="ts">
	import { enhance } from '$app/forms';
	import MarkdownIt from 'markdown-it';
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

	// Per-tab write / preview mode
	let viewMode: Record<string, 'write' | 'preview'> = $state(
		Object.fromEntries(policyTypes.map((t) => [t.id, 'write']))
	);

	// Textarea DOM refs, populated via bind:this
	let textareaEls: Record<string, HTMLTextAreaElement> = {};

	// Client-side markdown renderer for the preview pane (matches server config)
	const md = new MarkdownIt({ html: false, linkify: true });

	// Wrap the current selection (or a placeholder) with before/after markers
	function wrapSelection(tabId: string, before: string, after: string, placeholder = 'text') {
		const el = textareaEls[tabId];
		if (!el) return;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		const sel = el.value.slice(start, end) || placeholder;
		contents[tabId] = el.value.slice(0, start) + before + sel + after + el.value.slice(end);
		setTimeout(() => {
			el.focus();
			el.setSelectionRange(start + before.length, start + before.length + sel.length);
		}, 0);
	}

	// Insert text at the cursor position (replaces any selection)
	function insertAtCursor(tabId: string, text: string) {
		const el = textareaEls[tabId];
		if (!el) return;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		contents[tabId] = el.value.slice(0, start) + text + el.value.slice(end);
		setTimeout(() => {
			const pos = start + text.length;
			el.focus();
			el.setSelectionRange(pos, pos);
		}, 0);
	}

	const TABLE_TEMPLATE =
		'| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n';
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

						<!-- Formatting toolbar -->
						<div class="flex flex-wrap gap-1 p-1.5 mb-2 border border-[--color-border] rounded-lg bg-[--color-surface]">
							<button
								type="button"
								title="Bold"
								onclick={() => wrapSelection(pt.id, '**', '**', 'bold text')}
								class="px-2 py-1 text-xs font-bold rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>B</button>
							<button
								type="button"
								title="Italic"
								onclick={() => wrapSelection(pt.id, '_', '_', 'italic text')}
								class="px-2 py-1 text-xs italic rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>I</button>
							<button
								type="button"
								title="Heading (H2)"
								onclick={() => insertAtCursor(pt.id, '\n## ')}
								class="px-2 py-1 text-xs rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>H2</button>
							<button
								type="button"
								title="Bullet list item"
								onclick={() => insertAtCursor(pt.id, '\n- ')}
								class="px-2 py-1 text-xs rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>• List</button>
							<button
								type="button"
								title="Numbered list item"
								onclick={() => insertAtCursor(pt.id, '\n1. ')}
								class="px-2 py-1 text-xs rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>1. List</button>
							<button
								type="button"
								title="Insert table template"
								onclick={() => insertAtCursor(pt.id, '\n' + TABLE_TEMPLATE)}
								class="px-2 py-1 text-xs rounded border border-[--color-border] hover:bg-[--color-border] transition-colors leading-none"
							>⊞ Table</button>
						</div>

						{#if pt.id === 'faq'}
							<!-- FAQ format guide -->
							<p class="text-xs text-[--color-text-muted] mb-2 leading-relaxed p-2 border border-[--color-border] rounded-lg bg-[--color-surface]">
								<strong>FAQ format:</strong> use <code class="bg-[--color-border] px-1 rounded">## Your question here</code> for each question heading. The lines that follow become the answer and support full markdown — bullet lists, numbered lists, bold, tables, etc. Each <code class="bg-[--color-border] px-1 rounded">##</code> heading starts a new Q&amp;A pair.
							</p>
						{/if}

						<!-- Write / Preview tab switcher -->
						<div class="flex border-b border-[--color-border]">
							<button
								type="button"
								onclick={() => (viewMode[pt.id] = 'write')}
								class="px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors {viewMode[pt.id] === 'write'
									? 'border-[--color-accent] text-[--color-accent]'
									: 'border-transparent text-[--color-text-muted] hover:text-[--color-text]'}"
							>Write</button>
							<button
								type="button"
								onclick={() => (viewMode[pt.id] = 'preview')}
								class="px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors {viewMode[pt.id] === 'preview'
									? 'border-[--color-accent] text-[--color-accent]'
									: 'border-transparent text-[--color-text-muted] hover:text-[--color-text]'}"
							>Preview</button>
						</div>

						{#if viewMode[pt.id] === 'write'}
							<textarea
								id="content-{pt.id}"
								name="content"
								rows="12"
								bind:value={contents[pt.id]}
								bind:this={textareaEls[pt.id]}
								class="w-full border border-t-0 border-[--color-border] rounded-b-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-accent] resize-y"
								placeholder="Write your {pt.label.toLowerCase()} policy here…"
							></textarea>
						{:else}
							<!-- Hidden input so form submission still carries the content value -->
							<input type="hidden" name="content" value={contents[pt.id]} />
							<div class="policy-preview w-full border border-t-0 border-[--color-border] rounded-b-lg px-4 py-3 min-h-[16rem] text-sm">
								{@html md.render(contents[pt.id] || '')}
							</div>
						{/if}

						{#if pt.id !== 'faq'}
							<p class="text-xs text-[--color-text-muted] mt-1">Markdown is supported (e.g. **bold**, _italic_, # Heading).</p>
						{/if}
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

<style>
	/* Preview pane prose styles — mirrors the storefront .policy-content rules */
	.policy-preview :global(h1),
	.policy-preview :global(h2),
	.policy-preview :global(h3) {
		font-weight: 700;
		margin: 1.25em 0 0.4em;
		color: var(--color-text);
	}
	.policy-preview :global(p) { margin: 0 0 0.75em; }
	.policy-preview :global(ul),
	.policy-preview :global(ol) { padding-left: 1.5em; margin: 0 0 0.75em; }
	.policy-preview :global(li) { margin-bottom: 0.3em; }
	.policy-preview :global(strong) { font-weight: 700; }
	.policy-preview :global(em) { font-style: italic; }
	.policy-preview :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75em 0;
		font-size: 0.875rem;
	}
	.policy-preview :global(th),
	.policy-preview :global(td) {
		border: 1px solid var(--color-border);
		padding: 6px 10px;
		text-align: left;
	}
	.policy-preview :global(th) {
		background: var(--color-surface);
		font-weight: 600;
	}
	.policy-preview :global(blockquote) {
		border-left: 3px solid var(--color-border);
		margin: 0.75em 0;
		padding: 0.4em 0.75em;
		color: var(--color-text-muted);
	}
	.policy-preview :global(code) {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 1px 4px;
		font-size: 0.875em;
	}
</style>
