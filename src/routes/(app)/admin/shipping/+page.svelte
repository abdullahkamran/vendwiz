<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let shippingFee = $state(parseFloat(data.store.shippingFee) || 0);
	let freeShippingThreshold = $state(
		data.store.freeShippingThreshold ? parseFloat(data.store.freeShippingThreshold) : ''
	);
	// Tax rate stored as decimal, display as percent
	let taxRatePercent = $state(
		data.store.taxRate ? parseFloat(data.store.taxRate) * 100 : 0
	);
	let taxLabel = $state(data.store.taxLabel ?? 'Tax');
	let saving = $state(false);

	const exampleSubtotal = 1500;
	let isFreeShipping = $derived(
		freeShippingThreshold !== '' && exampleSubtotal >= Number(freeShippingThreshold)
	);
	let appliedShipping = $derived(isFreeShipping ? 0 : shippingFee);
	let taxAmount = $derived((exampleSubtotal * taxRatePercent) / 100);
	let previewTotal = $derived(exampleSubtotal + appliedShipping + taxAmount);
</script>

<div class="max-w-[700px]">
	<h1 class="text-2xl font-bold text-[--color-text] mb-6">Shipping & Tax</h1>

	{#if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
			Shipping & tax settings saved successfully.
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
		<!-- Shipping -->
		<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
			<h2 class="text-lg font-semibold mb-4">Shipping</h2>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-[--color-text] mb-1" for="shippingFee">
						Flat Shipping Fee (Rs.)
					</label>
					<input
						id="shippingFee"
						name="shippingFee"
						type="number"
						min="0"
						step="0.01"
						bind:value={shippingFee}
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="0"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">Applied to every order. Set to 0 for free shipping on all orders.</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-[--color-text] mb-1" for="freeShippingThreshold">
						Free Shipping Threshold (Rs., optional)
					</label>
					<input
						id="freeShippingThreshold"
						name="freeShippingThreshold"
						type="number"
						min="0"
						step="0.01"
						bind:value={freeShippingThreshold}
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="Leave blank to disable free shipping threshold"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">Orders above this amount get free shipping. Leave blank to disable.</p>
				</div>
			</div>
		</section>

		<!-- Tax -->
		<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
			<h2 class="text-lg font-semibold mb-4">Tax</h2>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-[--color-text] mb-1" for="taxRate">
						Tax Rate (%)
					</label>
					<input
						id="taxRate"
						name="taxRate"
						type="number"
						min="0"
						max="100"
						step="0.01"
						bind:value={taxRatePercent}
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="e.g. 17 for 17% GST"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">Enter as percentage (e.g. 17 for 17%). Set to 0 to disable tax.</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-[--color-text] mb-1" for="taxLabel">
						Tax Label
					</label>
					<input
						id="taxLabel"
						name="taxLabel"
						type="text"
						bind:value={taxLabel}
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="GST / VAT / Sales Tax"
						maxlength="30"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">Displayed at checkout (e.g. "GST", "VAT", "Sales Tax").</p>
				</div>
			</div>
		</section>

		<!-- Preview -->
		<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
			<h2 class="text-lg font-semibold mb-4">Order Total Preview</h2>
			<div class="text-sm space-y-2 max-w-xs">
				<div class="flex justify-between text-[--color-text-muted]">
					<span>Subtotal (example Rs. 1,500)</span>
					<span>Rs. {exampleSubtotal.toLocaleString()}</span>
				</div>
				<div class="flex justify-between text-[--color-text-muted]">
					<span>Shipping{isFreeShipping ? ' (free!)' : ''}</span>
					<span>Rs. {appliedShipping.toLocaleString()}</span>
				</div>
				{#if taxRatePercent > 0}
					<div class="flex justify-between text-[--color-text-muted]">
						<span>{taxLabel} ({taxRatePercent}%)</span>
						<span>Rs. {taxAmount.toFixed(2)}</span>
					</div>
				{/if}
				<div class="flex justify-between font-semibold border-t border-[--color-border] pt-2 mt-2">
					<span>Total</span>
					<span>Rs. {previewTotal.toFixed(2)}</span>
				</div>
			</div>
		</section>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={saving}
				class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
			>
				{saving ? 'Saving…' : 'Save Shipping & Tax'}
			</button>
		</div>
	</form>
</div>
