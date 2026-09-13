<script lang="ts">
	interface Props {
		ondone: (subdomain: string) => void;
	}

	let { ondone }: Props = $props();

	let subdomain = $state('');
	let checking = $state(false);
	let available: boolean | null = $state(null);
	let validationError = $state('');
	let submitError = $state('');

	const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

	// Debounce handle
	let debounceTimer: ReturnType<typeof setTimeout>;

	function onInput() {
		available = null;
		validationError = '';
		clearTimeout(debounceTimer);

		const val = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
		subdomain = val;

		if (!val) return;

		if (val.length < 3) {
			validationError = 'Must be at least 3 characters';
			return;
		}

		if (!SUBDOMAIN_RE.test(val)) {
			validationError = 'Letters, numbers, and hyphens only; must start and end alphanumeric';
			return;
		}

		debounceTimer = setTimeout(() => checkAvailability(val), 450);
	}

	async function checkAvailability(val: string) {
		checking = true;
		try {
			const res = await fetch(`/api/onboarding/check-subdomain?q=${encodeURIComponent(val)}`);
			const data = await res.json();
			if (data.error) {
				validationError = data.error;
				available = false;
			} else {
				available = data.available;
			}
		} catch {
			// Silently ignore network errors during check
		} finally {
			checking = false;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitError = '';

		if (!subdomain || !SUBDOMAIN_RE.test(subdomain)) {
			submitError = 'Please enter a valid subdomain';
			return;
		}

		if (available === false) {
			submitError = 'This subdomain is already taken';
			return;
		}

		if (available !== true) {
			submitError = 'Please wait for availability check to complete';
			return;
		}

		ondone(subdomain);
	}
</script>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-xl font-semibold text-[var(--color-primary)]">Claim your subdomain</h2>
		<p class="mt-1 text-sm text-[var(--color-text-muted)]">
			Your store will be reachable at <strong>{subdomain || 'yourstore'}.vendwiz.com</strong>
		</p>
	</div>

	<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
		{#if submitError}
			<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
				{submitError}
			</div>
		{/if}

		<div class="flex flex-col gap-1.5">
			<label for="subdomain" class="text-sm font-medium text-[var(--color-text)]">Subdomain</label>

			<div class="relative">
				<input
					id="subdomain"
					type="text"
					bind:value={subdomain}
					oninput={onInput}
					placeholder="mystore"
					autocomplete="off"
					spellcheck="false"
					maxlength="30"
					class="w-full border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]
						{available === true
						? 'border-green-400 bg-green-50/30'
						: available === false
							? 'border-red-400 bg-red-50/30'
							: 'border-[var(--color-border)]'}"
				/>

				<!-- Status indicator -->
				{#if checking}
					<span class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
						</svg>
					</span>
				{:else if available === true}
					<span class="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 text-lg">✓</span>
				{:else if available === false}
					<span class="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">✗</span>
				{/if}
			</div>

			{#if validationError}
				<p class="text-xs text-red-600">{validationError}</p>
			{:else if available === true}
				<p class="text-xs text-green-600">
					<strong>{subdomain}.vendwiz.com</strong> is available!
				</p>
			{:else if available === false}
				<p class="text-xs text-red-600">This subdomain is already taken.</p>
			{:else}
				<p class="text-xs text-[var(--color-text-muted)]">3–30 characters, letters, numbers, hyphens</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={available !== true || checking}
			class="w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
		>
			Claim subdomain
		</button>
	</form>
</div>
