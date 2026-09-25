<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	async function handleChangePassword(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		success = '';

		if (newPassword.length < 8) { error = 'New password must be at least 8 characters'; return; }
		if (newPassword !== confirmPassword) { error = 'Passwords do not match'; return; }

		loading = true;
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: false
		});
		loading = false;

		if (result?.error) {
			error = result.error.message ?? 'Failed to change password';
		} else {
			success = 'Password changed successfully';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
	}
</script>

<svelte:head>
	<title>Account — VendWiz</title>
</svelte:head>

<div class="max-w-lg">
	<h1 class="text-xl font-semibold text-[var(--color-text)] mb-6">Account</h1>

	<!-- User info -->
	<div class="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
		<h2 class="text-sm font-semibold text-[var(--color-text)] mb-3">Profile</h2>
		<div class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]">
			<span><span class="font-medium text-[var(--color-text)]">Name:</span> {data.user?.name}</span>
			<span><span class="font-medium text-[var(--color-text)]">Email:</span> {data.user?.email}</span>
		</div>
	</div>

	<!-- Change password -->
	<div class="bg-white rounded-xl border border-[var(--color-border)] p-6">
		<h2 class="text-sm font-semibold text-[var(--color-text)] mb-4">Change password</h2>

		<form onsubmit={handleChangePassword} novalidate class="flex flex-col gap-4">
			{#if error}
				<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			{/if}
			{#if success}
				<div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
					{success}
				</div>
			{/if}

			<div class="flex flex-col gap-1.5">
				<label for="current-password" class="text-sm font-medium text-[var(--color-text)]">Current password</label>
				<input
					id="current-password"
					type="password"
					bind:value={currentPassword}
					autocomplete="current-password"
					placeholder="••••••••"
					required
					class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
				/>
			</div>

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
				<label for="confirm-password" class="text-sm font-medium text-[var(--color-text)]">Confirm new password</label>
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
				class="w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
			>
				{loading ? 'Saving…' : 'Change password'}
			</button>
		</form>
	</div>
</div>
