<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let sidebarOpen = $state(false);

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: '⊞' },
		{ href: '/admin/products', label: 'Products', icon: '📦' },
		{ href: '/admin/categories', label: 'Categories', icon: '🗂️' },
		{ href: '/admin/orders', label: 'Orders', icon: '🛒' },
		{ href: '/admin/discounts', label: 'Discounts', icon: '🏷️' },
		{ href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
		{ href: '/admin/settings', label: 'Settings', icon: '⚙️' }
	] as const;

	function isActive(href: string) {
		const path = $page.url.pathname;
		if (href === '/admin') return path === '/admin';
		return path.startsWith(href);
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}
</script>

<div class="flex h-screen bg-[var(--color-surface-2)] overflow-hidden">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-20 bg-black/40 lg:hidden cursor-default"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-[var(--color-primary)] text-white transition-transform lg:relative lg:translate-x-0
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<!-- Store brand -->
		<div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
			{#if data.store.logoUrl}
				<img
					src={data.store.logoUrl}
					alt={data.store.name}
					class="w-8 h-8 rounded object-contain bg-white/10"
				/>
			{:else}
				<div class="w-8 h-8 rounded bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold">
					{data.store.name[0]?.toUpperCase()}
				</div>
			{/if}
			<div class="min-w-0">
				<p class="text-sm font-semibold truncate">{data.store.name}</p>
				<p class="text-xs text-white/50 truncate">{data.store.subdomain}.vendwiz.com</p>
			</div>
		</div>

		<!-- Nav -->
		<nav class="flex-1 px-3 py-4 overflow-y-auto">
			<ul class="flex flex-col gap-0.5">
				{#each navItems as item}
					<li>
						<a
							href={item.href}
							class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
								{isActive(item.href)
								? 'bg-white/15 text-white font-medium'
								: 'text-white/70 hover:bg-white/10 hover:text-white'}"
						>
							<span class="text-base">{item.icon}</span>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- User footer -->
		<div class="px-4 py-4 border-t border-white/10">
			<div class="flex items-center gap-2.5 mb-3">
				<div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
					{data.user?.name?.[0]?.toUpperCase() ?? '?'}
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-medium truncate">{data.user?.name}</p>
					<p class="text-xs text-white/50 truncate">{data.user?.email}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={handleSignOut}
				class="w-full text-left text-xs text-white/60 hover:text-white transition-colors cursor-pointer px-1"
			>
				Sign out →
			</button>
		</div>
	</aside>

	<!-- Main area -->
	<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
		<!-- Top bar (mobile) -->
		<header class="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-[var(--color-border)]">
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
			<span class="text-sm font-semibold text-[var(--color-primary)]">{data.store.name}</span>
		</header>

		<!-- Page content -->
		<main class="flex-1 overflow-y-auto p-6">
			{@render children()}
		</main>
	</div>
</div>
