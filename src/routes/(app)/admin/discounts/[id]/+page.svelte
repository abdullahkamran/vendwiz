<script lang="ts">
	import DiscountForm from '../DiscountForm.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
</script>

<div class="max-w-[600px]">
	<div class="flex items-center gap-3 mb-6">
		<a href="/admin/discounts" class="text-[--color-text-muted] hover:text-[--color-text] transition-colors">
			← Back
		</a>
		<h1 class="text-2xl font-bold text-[--color-text]">Edit Discount: {data.discount.code}</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<DiscountForm discount={data.discount} actionUrl="?/default" bind:saving />
</div>
