<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	// Per-field password visibility toggles
	let show = $state({ current: false, newPw: false, confirm: false });

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
				<div class="relative">
					<input
						id="current-password"
						type={show.current ? 'text' : 'password'}
						value={currentPassword}
						oninput={(e) => (currentPassword = (e.target as HTMLInputElement).value)}
						autocomplete="current-password"
						placeholder="••••••••"
						required
						class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
					/>
					<button
						type="button"
						aria-label={show.current ? 'Hide password' : 'Show password'}
						aria-pressed={show.current}
						onclick={() => (show.current = !show.current)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{#if show.current}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="new-password" class="text-sm font-medium text-[var(--color-text)]">New password</label>
				<div class="relative">
					<input
						id="new-password"
						type={show.newPw ? 'text' : 'password'}
						value={newPassword}
						oninput={(e) => (newPassword = (e.target as HTMLInputElement).value)}
						autocomplete="new-password"
						placeholder="••••••••"
						required
						class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
					/>
					<button
						type="button"
						aria-label={show.newPw ? 'Hide password' : 'Show password'}
						aria-pressed={show.newPw}
						onclick={() => (show.newPw = !show.newPw)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{#if show.newPw}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="confirm-password" class="text-sm font-medium text-[var(--color-text)]">Confirm new password</label>
				<div class="relative">
					<input
						id="confirm-password"
						type={show.confirm ? 'text' : 'password'}
						value={confirmPassword}
						oninput={(e) => (confirmPassword = (e.target as HTMLInputElement).value)}
						autocomplete="new-password"
						placeholder="••••••••"
						required
						class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
					/>
					<button
						type="button"
						aria-label={show.confirm ? 'Hide password' : 'Show password'}
						aria-pressed={show.confirm}
						onclick={() => (show.confirm = !show.confirm)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{#if show.confirm}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
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
