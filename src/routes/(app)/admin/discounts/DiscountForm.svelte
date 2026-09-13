<script lang="ts">
	import { enhance } from '$app/forms';
	import type { DiscountCode } from '$lib/types';

	interface Props {
		discount?: DiscountCode;
		actionUrl: string;
		saving?: boolean;
	}

	let { discount, actionUrl, saving = $bindable(false) }: Props = $props();

	let code = $state(discount?.code ?? '');
	let type = $state<'percentage' | 'fixed'>(discount?.type ?? 'percentage');
	let value = $state(discount ? parseFloat(discount.value) : 10);
	let minOrderAmount = $state(discount?.minOrderAmount ? parseFloat(discount.minOrderAmount) : '');
	let usageLimit = $state(discount?.usageLimit ?? '');
	let isActive = $state(discount?.isActive ?? true);
	let expiresAt = $state(
		discount?.expiresAt
			? new Date(discount.expiresAt).toISOString().slice(0, 10)
			: ''
	);

	function generateCode() {
		const words = ['SAVE', 'DEAL', 'OFF', 'SALE', 'BUY', 'GET', 'WIN', 'BEST'];
		const word = words[Math.floor(Math.random() * words.length)];
		const num = Math.floor(Math.random() * 75) + 5;
		code = `${word}${num}`;
	}

	function handleCodeInput(e: Event) {
		const input = e.target as HTMLInputElement;
		code = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
	}
</script>

<form
	method="POST"
	action={actionUrl}
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<div class="space-y-4">
			<!-- Code -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="code">
					Discount Code <span class="text-red-500">*</span>
				</label>
				<div class="flex gap-2">
					<input
						id="code"
						name="code"
						type="text"
						required
						value={code}
						oninput={handleCodeInput}
						minlength="3"
						maxlength="20"
						pattern="[A-Z0-9-]+"
						class="flex-1 border border-[--color-border] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-accent] uppercase"
						placeholder="SUMMER25"
					/>
					<button
						type="button"
						onclick={generateCode}
						class="px-3 py-2 border border-[--color-border] rounded-lg text-sm hover:bg-[--color-surface-2] transition-colors whitespace-nowrap"
					>
						Generate
					</button>
				</div>
				<p class="text-xs text-[--color-text-muted] mt-1">3–20 characters, uppercase letters, numbers, hyphens only.</p>
			</div>

			<!-- Type -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1">Discount Type</label>
				<div class="flex gap-3">
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="radio" name="type" value="percentage" bind:group={type} />
						<span class="text-sm">Percentage (%)</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="radio" name="type" value="fixed" bind:group={type} />
						<span class="text-sm">Fixed Amount (Rs.)</span>
					</label>
				</div>
			</div>

			<!-- Value -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="value">
					Value <span class="text-red-500">*</span>
				</label>
				<div class="relative">
					<input
						id="value"
						name="value"
						type="number"
						required
						min={type === 'percentage' ? 1 : 0.01}
						max={type === 'percentage' ? 100 : undefined}
						step={type === 'percentage' ? 1 : 0.01}
						bind:value
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent] pr-12"
					/>
					<span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[--color-text-muted]">
						{type === 'percentage' ? '%' : 'Rs.'}
					</span>
				</div>
			</div>

			<!-- Min order amount -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="minOrderAmount">
					Minimum Order Amount (optional)
				</label>
				<input
					id="minOrderAmount"
					name="minOrderAmount"
					type="number"
					min="0"
					step="0.01"
					bind:value={minOrderAmount}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="Leave blank for no minimum"
				/>
			</div>

			<!-- Usage limit -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="usageLimit">
					Usage Limit (optional)
				</label>
				<input
					id="usageLimit"
					name="usageLimit"
					type="number"
					min="1"
					step="1"
					bind:value={usageLimit}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="Leave blank for unlimited uses"
				/>
			</div>

			<!-- Expires at -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="expiresAt">
					Expiry Date (optional)
				</label>
				<input
					id="expiresAt"
					name="expiresAt"
					type="date"
					bind:value={expiresAt}
					min={new Date().toISOString().slice(0, 10)}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
				/>
			</div>

			<!-- Active toggle -->
			<div class="flex items-center justify-between py-2">
				<div>
					<p class="text-sm font-medium text-[--color-text]">Active</p>
					<p class="text-xs text-[--color-text-muted]">Discount can be applied at checkout</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" name="isActive" bind:checked={isActive} class="sr-only peer" />
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[--color-accent] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-accent]"
					></div>
				</label>
			</div>
		</div>
	</section>

	<div class="flex gap-3 justify-end">
		<a
			href="/admin/discounts"
			class="px-5 py-2 border border-[--color-border] rounded-lg text-sm font-medium hover:bg-[--color-surface-2] transition-colors"
		>
			Cancel
		</a>
		<button
			type="submit"
			disabled={saving}
			class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
		>
			{saving ? 'Saving…' : discount ? 'Update Discount' : 'Create Discount'}
		</button>
	</div>
</form>
