<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const navItems = [
		{ href: '/admin/settings', label: 'General Settings', icon: '⚙️', match: '/admin/settings' },
		{ href: '/admin/discounts', label: 'Discounts', icon: '🏷️', match: '/admin/discounts' },
		{ href: '/admin/shipping', label: 'Shipping & Tax', icon: '📦', match: '/admin/shipping' }
	];

	function isActive(match: string) {
		return $page.url.pathname.startsWith(match);
	}
</script>

<div class="flex min-h-screen bg-[--color-surface-2]">
	<!-- Sidebar -->
	<aside class="w-[250px] shrink-0 bg-[--color-surface] border-r border-[--color-border] flex flex-col">
		<div class="p-4 border-b border-[--color-border]">
			<div class="text-sm font-bold text-[--color-primary] truncate">{data.store.name}</div>
			<a
				href="/"
				class="text-xs text-[--color-text-muted] hover:text-[--color-accent] transition-colors mt-1 block"
			>
				View Store →
			</a>
		</div>
		<nav class="flex-1 p-3 space-y-1">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors {isActive(item.match)
						? 'bg-[--color-primary] text-white'
						: 'text-[--color-text] hover:bg-[--color-surface-2]'}"
				>
					<span>{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Main content -->
	<div class="flex-1 flex flex-col min-w-0">
		<header class="bg-[--color-surface] border-b border-[--color-border] px-6 py-3 flex items-center gap-4">
			<h1 class="text-base font-semibold text-[--color-text]">Admin Dashboard</h1>
		</header>
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>
</div>
