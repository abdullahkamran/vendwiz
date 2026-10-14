<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';
	import { navItems, isActive as isNavActive, makeNavOnClick } from './admin-nav';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let sidebarOpen = $state(false);

	const navOnClick = makeNavOnClick((v) => (sidebarOpen = v));

	function isActive(href: string) {
		return isNavActive(href, $page.url.pathname);
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}
</script>

<div class="admin-shell flex h-screen bg-[var(--color-surface-2)] overflow-hidden">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-20 bg-black/40 md:hidden cursor-default"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-white text-[var(--color-text)] border-r border-[var(--color-border)] transition-transform md:relative md:translate-x-0
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<!-- Store brand -->
		<div class="flex items-center gap-3 px-5 py-6 border-b border-[var(--color-border)]">
			{#if data.store.logoUrl}
				<img
					src={data.store.logoUrl}
					alt={data.store.name}
					class="w-8 h-8 rounded object-contain bg-[var(--color-surface-2)]"
				/>
			{:else}
				<div class="w-8 h-8 rounded bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-semibold">
					{data.store.name[0]?.toUpperCase()}
				</div>
			{/if}
			<div class="min-w-0">
				<p class="text-base font-bold truncate tracking-tight" style="font-family: var(--font-heading);">{data.store.name}</p>
				<p class="text-xs text-[var(--color-text-muted)] truncate">{data.store.subdomain}.vendwiz.com</p>
			</div>
		</div>

		<!-- Nav -->
		<nav class="flex-1 px-3 py-5 overflow-y-auto">
			<ul class="flex flex-col gap-0.5">
				{#each navItems as item}
					<li>
						<a
							href={item.href}
							onclick={navOnClick}
							class="flex items-center gap-3 pl-3 pr-3 py-2.5 rounded text-sm transition-colors border-l-2
								{isActive(item.href)
								? 'border-[var(--color-primary)] bg-[var(--color-surface-2)] text-[var(--color-text)] font-medium'
								: 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'}"
						>
							<span class="text-base {isActive(item.href) ? '' : 'grayscale opacity-60'}">{item.icon}</span>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- User footer -->
		<div class="px-4 py-4 border-t border-[var(--color-border)]">
			<div class="flex items-center gap-2.5 mb-3">
				<div class="w-7 h-7 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold">
					{data.user?.name?.[0]?.toUpperCase() ?? '?'}
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-medium truncate">{data.user?.name}</p>
					<p class="text-xs text-[var(--color-text-muted)] truncate">{data.user?.email}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={handleSignOut}
				class="w-full text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer px-1"
			>
				Sign out →
			</button>
		</div>
	</aside>

	<!-- Main area -->
	<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
		<!-- Top bar (mobile) -->
		<header class="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-[var(--color-border)]">
			<button
				type="button"
				onclick={() => (sidebarOpen = true)}
				class="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer"
				aria-label="Open sidebar"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<span class="text-base font-bold tracking-tight text-[var(--color-primary)]" style="font-family: var(--font-heading);">{data.store.name}</span>
		</header>

		<!-- Page content -->
		<main class="flex-1 overflow-y-auto px-5 py-7 md:px-10 md:py-9">
			{@render children()}
		</main>
	</div>
</div>
