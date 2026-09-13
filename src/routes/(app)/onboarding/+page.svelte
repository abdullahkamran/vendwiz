<script lang="ts">
	import Step1Verify from './Step1Verify.svelte';
	import Step2Subdomain from './Step2Subdomain.svelte';
	import Step3StoreName from './Step3StoreName.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let step = $state(1);
	let verifiedCode = $state('');
	let claimedSubdomain = $state('');

	// If the server returned an error from the createStore action, go back to step 3
	// (the step state is ephemeral, so on hard reload they'd restart from step 1 — acceptable)

	function onStep1Done(code: string) {
		verifiedCode = code;
		step = 2;
	}

	function onStep2Done(subdomain: string) {
		claimedSubdomain = subdomain;
		step = 3;
	}

	const steps = [
		{ n: 1, label: 'License' },
		{ n: 2, label: 'Subdomain' },
		{ n: 3, label: 'Branding' }
	];
</script>

<svelte:head>
	<title>Set up your store — VendWiz</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[var(--color-surface-2)] px-4 py-12">
	<div class="w-full max-w-[520px]">
		<!-- Brand header -->
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-2xl font-bold text-[var(--color-primary)]">VendWiz</a>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">Let's get your store ready</p>
		</div>

		<!-- Step indicator -->
		<div class="flex items-center mb-8 px-4">
			{#each steps as s, i}
				<div class="flex items-center {i < steps.length - 1 ? 'flex-1' : ''}">
					<div class="flex flex-col items-center gap-1">
						<div
							class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
								{step > s.n
								? 'bg-green-500 text-white'
								: step === s.n
									? 'bg-[var(--color-accent)] text-white'
									: 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}"
						>
							{step > s.n ? '✓' : s.n}
						</div>
						<span
							class="text-xs whitespace-nowrap
								{step === s.n
								? 'text-[var(--color-accent)] font-medium'
								: 'text-[var(--color-text-muted)]'}"
						>
							{s.label}
						</span>
					</div>

					{#if i < steps.length - 1}
						<div
							class="flex-1 h-0.5 mx-2 mb-4 transition-all
								{step > s.n ? 'bg-green-500' : 'bg-[var(--color-border)]'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Card -->
		<div class="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
			{#if step === 1}
				<Step1Verify ondone={onStep1Done} />
			{:else if step === 2}
				<Step2Subdomain ondone={onStep2Done} />
			{:else}
				<Step3StoreName
					licenseCode={verifiedCode}
					subdomain={claimedSubdomain}
					serverError={form?.error}
				/>
			{/if}
		</div>

		<!-- Back link for steps 2 / 3 -->
		{#if step > 1}
			<button
				type="button"
				onclick={() => step--}
				class="mt-4 w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
			>
				← Go back
			</button>
		{/if}
	</div>
</div>
