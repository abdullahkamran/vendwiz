<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let error = $state('');
	let sent = $state(false);
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!email) { error = 'Email is required'; return; }
		loading = true;
		const result = await authClient.forgetPassword({ email, redirectTo: '/reset-password' });
		loading = false;
		if (result?.error) {
			error = result.error.message ?? 'Something went wrong';
		} else {
			sent = true;
		}
	}
</script>

<svelte:head>
	<title>Forgot Password — VendWiz</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[var(--color-surface-2)] px-4">
	<div class="w-full max-w-[440px]">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-2xl font-bold text-[var(--color-primary)]">VendWiz</a>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">Reset your password</p>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
			{#if sent}
				<div class="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700 text-center">
					Check your email for a password reset link.
				</div>
			{:else}
				<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
					{#if error}
						<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					{/if}

					<div class="flex flex-col gap-1.5">
						<label for="email" class="text-sm font-medium text-[var(--color-text)]">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							autocomplete="email"
							placeholder="you@example.com"
							required
							class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="mt-1 w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
					>
						{loading ? 'Sending…' : 'Send reset link'}
					</button>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-sm text-[var(--color-text-muted)]">
			Remember your password?
			<a href="/login" class="font-medium text-[var(--color-accent)] hover:underline">Sign in</a>
		</p>
	</div>
</div>
