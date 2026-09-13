<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let whatsapp = $state(data.store.whatsapp ?? '');
	let instagram = $state(data.store.instagram ?? '');
	let facebook = $state(data.store.facebook ?? '');
	let contactEmail = $state(data.store.contactEmail ?? '');
	let contactPhone = $state(data.store.contactPhone ?? '');
	let saving = $state(false);
</script>

{#if form?.error}
	<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
		{form.error}
	</div>
{/if}
{#if form?.success}
	<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
		Social links saved successfully.
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
		<h2 class="text-lg font-semibold mb-4">Social Links & Contact</h2>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="whatsapp">
					WhatsApp Number
				</label>
				<input
					id="whatsapp"
					name="whatsapp"
					type="text"
					bind:value={whatsapp}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="+92300xxxxxxx"
				/>
				<p class="text-xs text-[--color-text-muted] mt-1">Include country code, e.g. +92300xxxxxxx</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="instagram">
					Instagram URL
				</label>
				<input
					id="instagram"
					name="instagram"
					type="url"
					bind:value={instagram}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="https://instagram.com/yourstore"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="facebook">
					Facebook URL
				</label>
				<input
					id="facebook"
					name="facebook"
					type="url"
					bind:value={facebook}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="https://facebook.com/yourstore"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="contactEmail">
					Contact Email
				</label>
				<input
					id="contactEmail"
					name="contactEmail"
					type="email"
					bind:value={contactEmail}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="hello@mystore.com"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="contactPhone">
					Contact Phone
				</label>
				<input
					id="contactPhone"
					name="contactPhone"
					type="text"
					bind:value={contactPhone}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="+92300xxxxxxx"
				/>
			</div>
		</div>
	</section>

	<div class="flex justify-end">
		<button
			type="submit"
			disabled={saving}
			class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save Social Links'}
		</button>
	</div>
</form>
