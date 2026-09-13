<script lang="ts">
	import { page } from '$app/stores';

	let { children }: { children: any } = $props();

	const tabs = [
		{ href: '/admin/settings', label: 'General', exact: true },
		{ href: '/admin/settings/social', label: 'Social' },
		{ href: '/admin/settings/policies', label: 'Policies' },
		{ href: '/admin/settings/announcement', label: 'Announcement' }
	];

	function isActive(href: string, exact: boolean = false) {
		if (exact) return $page.url.pathname === href;
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="max-w-[700px]">
	<h1 class="text-2xl font-bold text-[--color-text] mb-6">Store Settings</h1>

	<!-- Settings sub-nav -->
	<div class="flex gap-1 mb-6 border-b border-[--color-border]">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px {isActive(tab.href, tab.exact)
					? 'border-[--color-accent] text-[--color-accent]'
					: 'border-transparent text-[--color-text-muted] hover:text-[--color-text]'}"
			>
				{tab.label}
			</a>
		{/each}
	</div>

	{@render children()}
</div>
