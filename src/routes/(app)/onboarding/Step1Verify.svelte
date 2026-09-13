<script lang="ts">
	interface Props {
		ondone: (code: string) => void;
	}

	let { ondone }: Props = $props();

	let code = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!code.trim()) {
			error = 'Please enter your license code';
			return;
		}

		error = '';
		loading = true;

		try {
			const res = await fetch('/api/onboarding/verify-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: code.trim() })
			});

			const data = await res.json();

			if (!res.ok || data.error) {
				error = data.error ?? 'Invalid license code';
				return;
			}

			ondone(code.trim());
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-xl font-semibold text-[var(--color-primary)]">Enter your license code</h2>
		<p class="mt-1 text-sm text-[var(--color-text-muted)]">
			You received this code when you purchased VendWiz.
		</p>
	</div>

	<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
		{#if error}
			<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
				{error}
			</div>
		{/if}

		<div class="flex flex-col gap-1.5">
			<label for="code" class="text-sm font-medium text-[var(--color-text)]">License code</label>
			<input
				id="code"
				type="text"
				bind:value={code}
				placeholder="XXXX-XXXX-XXXX"
				autocomplete="off"
				spellcheck="false"
				class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
			/>
		</div>

		<button
			type="submit"
			disabled={loading}
			class="w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
		>
			{loading ? 'Verifying…' : 'Verify code'}
		</button>
	</form>
</div>
