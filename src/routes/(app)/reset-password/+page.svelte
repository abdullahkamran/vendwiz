<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (newPassword.length < 8) { error = 'Password must be at least 8 characters'; return; }
		if (newPassword !== confirmPassword) { error = 'Passwords do not match'; return; }

		const token = $page.url.searchParams.get('token');
		if (!token) { error = 'Invalid or missing reset token'; return; }

		loading = true;
		const result = await authClient.resetPassword({ newPassword, token });
		loading = false;

		if (result?.error) {
			error = result.error.message ?? 'Something went wrong';
		} else {
			goto('/login');
		}
	}
</script>

<svelte:head>
	<title>Reset Password — VendWiz</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[var(--color-surface-2)] px-4">
	<div class="w-full max-w-[440px]">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-2xl font-bold text-[var(--color-primary)]">VendWiz</a>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">Choose a new password</p>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
			<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
				{#if error}
					<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				{/if}

				<div class="flex flex-col gap-1.5">
					<label for="new-password" class="text-sm font-medium text-[var(--color-text)]">New password</label>
					<input
						id="new-password"
						type="password"
						bind:value={newPassword}
						autocomplete="new-password"
						placeholder="••••••••"
						required
						class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="confirm-password" class="text-sm font-medium text-[var(--color-text)]">Confirm password</label>
					<input
						id="confirm-password"
						type="password"
						bind:value={confirmPassword}
						autocomplete="new-password"
						placeholder="••••••••"
						required
						class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="mt-1 w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
				>
					{loading ? 'Saving…' : 'Set new password'}
				</button>
			</form>
		</div>
	</div>
</div>
