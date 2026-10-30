<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let whatsapp = $state(data.store.whatsapp ?? '');
	let instagram = $state(data.store.instagram ?? '');
	let facebook = $state(data.store.facebook ?? '');
	let contactEmail = $state(data.store.contactEmail ?? '');
	let contactPhone = $state(data.store.contactPhone ?? '');
	// "Our Stores" rows; the footer section is hidden while this list is empty
	let locations = $state((data.store.storeLocations ?? []).map((l) => ({ ...l })));
	function addLocation() { locations.push({ name: '', mapUrl: '' }); }
	function removeLocation(i: number) { locations.splice(i, 1); }
	let saving = $state(false);
</script>

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
		<h2 class="text-lg font-semibold mb-4">Social Links And Contact</h2>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-semibold text-[--color-text] mb-1" for="whatsapp">
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
				<label class="block text-sm font-semibold text-[--color-text] mb-1" for="instagram">
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
				<label class="block text-sm font-semibold text-[--color-text] mb-1" for="facebook">
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
				<label class="block text-sm font-semibold text-[--color-text] mb-1" for="contactEmail">
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
				<label class="block text-sm font-semibold text-[--color-text] mb-1" for="contactPhone">
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

	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-1">Our Stores</h2>
		<p class="text-sm text-[--color-text-muted] mb-4">
			Physical shops shown under "Our Stores" in your store's footer. Leave empty to hide this section.
		</p>
		<div class="space-y-3">
			{#each locations as loc, i}
				<div class="flex flex-col sm:flex-row gap-2 sm:items-end">
					<div class="sm:w-1/3">
						<label class="block text-sm font-semibold text-[--color-text] mb-1" for="locationName-{i}">Store name</label>
						<input
							id="locationName-{i}"
							name="locationName"
							type="text"
							maxlength="100"
							bind:value={loc.name}
							class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
							placeholder="DHA Phase 6 branch"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-sm font-semibold text-[--color-text] mb-1" for="locationMapUrl-{i}">Map link <span class="font-normal text-[--color-text-muted]">(optional)</span></label>
						<input
							id="locationMapUrl-{i}"
							name="locationMapUrl"
							type="url"
							bind:value={loc.mapUrl}
							class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
							placeholder="https://maps.app.goo.gl/…"
						/>
					</div>
					<button type="button" class="btn btn-secondary" onclick={() => removeLocation(i)} aria-label="Remove {loc.name || 'store'}">
						Remove
					</button>
				</div>
			{/each}
		</div>
		<button type="button" class="btn btn-secondary mt-4" onclick={addLocation}>+ Add store</button>
		<p class="text-xs text-[--color-text-muted] mt-2">
			Tip: in Google Maps, open the place, tap Share and copy the link.
		</p>
	</section>

	<div class="flex items-center justify-end gap-3">
		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}
		{#if form?.success}
			<p class="text-sm text-green-600">Social links saved successfully.</p>
		{/if}
		<button
			type="submit"
			disabled={saving}
			class="btn btn-primary"
		>
			{saving ? 'Saving…' : 'Save Social Links'}
		</button>
	</div>
</form>
