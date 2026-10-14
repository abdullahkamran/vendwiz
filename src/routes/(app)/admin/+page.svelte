<script lang="ts">
	import type { LayoutData } from './$types';

	// Inherits store + user from the layout
	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head>
	<title>Dashboard — {data.store.name}</title>
</svelte:head>

<!-- Page header -->
<div class="mb-8">
	<h1 class="text-2xl font-bold text-[var(--color-primary)]">
		Welcome back{data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''} 👋
	</h1>
	<p class="mt-1 text-sm text-[var(--color-text-muted)]">
		Here's a quick overview of <strong>{data.store.name}</strong>.
	</p>
</div>

<!-- Quick stats -->
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
	{#each [
		{ label: 'Total Products', value: '—', icon: '📦', href: '/admin/products' },
		{ label: 'Total Orders', value: '—', icon: '🛒', href: '/admin/orders' },
		{ label: 'Revenue', value: '—', icon: '💰', href: '/admin/orders' },
		{ label: 'Pending Reviews', value: '—', icon: '⭐', href: '/admin/reviews' }
	] as stat}
		<a
			href={stat.href}
			class="group flex items-start gap-4 bg-white rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-accent)]/40 hover:shadow-sm transition-all"
		>
			<div class="w-10 h-10 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-lg">
				{stat.icon}
			</div>
			<div>
				<p class="text-2xl font-bold text-[var(--color-primary)]">{stat.value}</p>
				<p class="text-xs text-[var(--color-text-muted)] mt-0.5">{stat.label}</p>
			</div>
		</a>
	{/each}
</div>

<!-- Quick actions -->
<div class="bg-white rounded-xl border border-[var(--color-border)] p-6">
	<h2 class="text-sm font-semibold text-[var(--color-text)] mb-4">Quick actions</h2>
	<div class="flex flex-wrap gap-3">
		<a
			href="/admin/products/new"
			class="btn btn-primary"
		>
			+ New product
		</a>
		<a
			href="/admin/categories/new"
			class="btn btn-secondary"
		>
			+ New category
		</a>
		<a
			href="/admin/discounts/new"
			class="btn btn-secondary"
		>
			+ New discount
		</a>
		<a
			href="{`//${data.store.subdomain}.vendwiz.com`}"
			target="_blank"
			rel="noopener noreferrer"
			class="btn btn-secondary"
		>
			View storefront ↗
		</a>
	</div>
</div>
