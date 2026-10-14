<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let bankName = $state(data.store.bankName ?? '');
	let bankAccountTitle = $state(data.store.bankAccountTitle ?? '');
	let bankAccountNumber = $state(data.store.bankAccountNumber ?? '');
	let bankIban = $state(data.store.bankIban ?? '');
	let bankBranch = $state(data.store.bankBranch ?? '');
	let saving = $state(false);

	let bankEnabled = $derived(!!bankName.trim() && !!bankAccountTitle.trim() && !!bankAccountNumber.trim());
</script>

<form
	method="POST"
	action="?/update"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-1">Payment methods</h2>
		<p class="text-sm text-[--color-text-muted] mb-4">
			Customers can always choose <strong>Cash on Delivery</strong>. Add your bank account below to also offer
			<strong>Bank Transfer</strong> at checkout — these details are shown to customers who choose it.
		</p>

		<div
			class="mb-5 rounded-lg px-3 py-2 text-sm {bankEnabled
				? 'bg-green-50 border border-green-200 text-green-800'
				: 'bg-gray-50 border border-gray-200 text-gray-700'}"
		>
			{#if bankEnabled}
				Bank Transfer is <strong>on</strong> — customers will see these details at checkout.
			{:else}
				Bank Transfer is <strong>off</strong> — customers can only choose Cash on Delivery.
			{/if}
		</div>

		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="bankName">
					Bank name <span class="text-red-500">*</span>
				</label>
				<input id="bankName" name="bankName" type="text" maxlength="100" bind:value={bankName} class="w-full text-sm" placeholder="e.g. HBL, Meezan Bank" />
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="bankAccountTitle">
					Account title <span class="text-red-500">*</span>
				</label>
				<input id="bankAccountTitle" name="bankAccountTitle" type="text" maxlength="100" bind:value={bankAccountTitle} class="w-full text-sm" placeholder="Name on the account" />
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="bankAccountNumber">
					Account number <span class="text-red-500">*</span>
				</label>
				<input id="bankAccountNumber" name="bankAccountNumber" type="text" maxlength="50" bind:value={bankAccountNumber} class="w-full text-sm" placeholder="e.g. 0123-4567890-01" />
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="bankIban">IBAN (optional)</label>
				<input id="bankIban" name="bankIban" type="text" maxlength="50" bind:value={bankIban} class="w-full text-sm" placeholder="e.g. PK36 SCBL 0000 0011 2345 6702" />
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="bankBranch">Branch (optional)</label>
				<input id="bankBranch" name="bankBranch" type="text" maxlength="100" bind:value={bankBranch} class="w-full text-sm" placeholder="Branch name or code" />
			</div>
		</div>

		<p class="text-xs text-[--color-text-muted] mt-4">
			{#if data.store.whatsapp}
				Customers are asked to send their payment screenshot to your WhatsApp number
				<strong>{data.store.whatsapp}</strong>.
			{:else}
				Customers are asked to send their payment screenshot to you on WhatsApp. Add your WhatsApp number under
				<a href="/admin/settings/social" class="underline">Social</a> so it appears in those instructions.
			{/if}
		</p>
	</section>

	<div class="flex items-center justify-end gap-3">
		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}
		{#if form?.success}
			<p class="text-sm text-green-600">Payment settings saved.</p>
		{/if}
		<button type="submit" disabled={saving} class="btn btn-primary">
			{saving ? 'Saving…' : 'Save Payment Settings'}
		</button>
	</div>
</form>
