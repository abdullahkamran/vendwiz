<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { loginSchema } from '$lib/schemas/auth';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		const parsed = loginSchema.safeParse({ email, password });
		if (!parsed.success) {
			error = parsed.error.errors[0].message;
			return;
		}

		loading = true;
		const result = await signIn.email({ email, password });

		if (result.error) {
			error = result.error.message ?? 'Invalid email or password';
			loading = false;
			return;
		}

		goto('/admin');
	}

	async function loginWithGoogle() {
		await signIn.social({ provider: 'google', callbackURL: '/admin' });
	}
</script>

<svelte:head>
	<title>Sign in — VendWiz</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[var(--color-surface-2)] px-4">
	<div class="w-full max-w-[440px]">
		<!-- Logo / brand -->
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-2xl font-bold text-[var(--color-primary)]">VendWiz</a>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">Sign in to your account</p>
		</div>

		<!-- Card -->
		<div class="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
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

				<div class="flex flex-col gap-1.5">
					<label for="password" class="text-sm font-medium text-[var(--color-text)]">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
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
					{loading ? 'Signing in…' : 'Sign in'}
				</button>
			</form>

			<div class="my-5 flex items-center gap-3 text-[var(--color-text-muted)] text-xs">
				<hr class="flex-1 border-[var(--color-border)]" />
				or continue with
				<hr class="flex-1 border-[var(--color-border)]" />
			</div>

			<button
				type="button"
				onclick={loginWithGoogle}
				class="w-full flex items-center justify-center gap-2.5 border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Continue with Google
			</button>
		</div>

		<p class="mt-6 text-center text-sm text-[var(--color-text-muted)]">
			Don't have an account?
			<a href="/register" class="font-medium text-[var(--color-accent)] hover:underline">Sign up</a>
		</p>
	</div>
</div>
