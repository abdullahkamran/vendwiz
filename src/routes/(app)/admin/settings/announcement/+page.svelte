<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let enabled = $state(data.store.announcementEnabled);
	let text = $state(data.store.announcementText ?? '');
	let bgColor = $state(data.store.announcementBg ?? '#1a1a2e');
	let fgColor = $state(data.store.announcementFg ?? '#ffffff');
	let saving = $state(false);
</script>

{#if form?.success}
	<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
		Announcement bar saved successfully.
	</div>
{/if}

<!-- Live preview -->
{#if enabled && text}
	<div
		class="rounded-lg px-4 py-2 text-sm text-center font-medium mb-6"
		style:background-color={bgColor}
		style:color={fgColor}
	>
		{text}
	</div>
{:else}
	<div class="rounded-lg px-4 py-2 text-sm text-center text-[--color-text-muted] border border-dashed border-[--color-border] mb-6">
		Announcement bar preview will appear here
	</div>
{/if}

<form
	method="POST"
	action="?/update"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-4">Announcement Bar</h2>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-[--color-text]">Enable Announcement Bar</p>
					<p class="text-xs text-[--color-text-muted]">Show a banner at the top of your storefront</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						name="announcementEnabled"
						bind:checked={enabled}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[--color-accent] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-accent]"
					></div>
				</label>
			</div>

			{#if enabled}
				<div>
					<label class="block text-sm font-medium text-[--color-text] mb-1" for="announcementText">
						Announcement Text
					</label>
					<input
						id="announcementText"
						name="announcementText"
						type="text"
						bind:value={text}
						maxlength="200"
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="🎉 Free shipping on orders over Rs. 2000!"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">{text.length}/200 characters</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-[--color-text] mb-1" for="announcementBg">
							Background Color
						</label>
						<div class="flex gap-2 items-center">
							<input
								id="announcementBg"
								name="announcementBg"
								type="color"
								bind:value={bgColor}
								class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
							/>
							<input
								type="text"
								value={bgColor}
								oninput={(e) => (bgColor = (e.target as HTMLInputElement).value)}
								class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-sm font-mono"
								maxlength="7"
							/>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-[--color-text] mb-1" for="announcementFg">
							Text Color
						</label>
						<div class="flex gap-2 items-center">
							<input
								id="announcementFg"
								name="announcementFg"
								type="color"
								bind:value={fgColor}
								class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
							/>
							<input
								type="text"
								value={fgColor}
								oninput={(e) => (fgColor = (e.target as HTMLInputElement).value)}
								class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-sm font-mono"
								maxlength="7"
							/>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<div class="flex justify-end">
		<button
			type="submit"
			disabled={saving}
			class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save Announcement'}
		</button>
	</div>
</form>
