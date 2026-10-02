<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { children }: { children: any } = $props();

	const tabs = [
		{ href: '/admin/settings', label: 'General', exact: true },
		{ href: '/admin/settings/social', label: 'Social' },
		{ href: '/admin/settings/policies', label: 'Policies' },
		{ href: '/admin/settings/announcement', label: 'Announcement' },
		{ href: '/admin/settings/shipping', label: 'Shipping & Tax' }
	];

	function isActive(href: string, exact: boolean = false) {
		if (exact) return $page.url.pathname === href;
		return $page.url.pathname.startsWith(href);
	}

	let dirty = $state(false);

	// Reset dirty whenever the route changes (back/forward, confirmed navigation, etc.)
	$effect(() => {
		$page.url.pathname;
		dirty = false;
	});

	function markDirty() {
		dirty = true;
	}

	function clearDirty() {
		dirty = false;
	}

	function handleTabClick(e: MouseEvent, href: string, exact: boolean = false) {
		if (!dirty) return;
		if (isActive(href, exact)) return;
		if (!confirm('You have unsaved changes — leave anyway?')) {
			e.preventDefault();
		} else {
			dirty = false;
		}
	}

	onMount(() => {
		function beforeUnload(e: BeforeUnloadEvent) {
			if (dirty) {
				e.preventDefault();
			}
		}
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	});
</script>

<div class="max-w-[700px]">
	<h1 class="text-2xl font-bold text-[--color-text] mb-6">Store Settings</h1>

	<!-- Settings sub-nav -->
	<div class="flex gap-1 mb-6 border-b border-[--color-border]">
		{#each tabs as tab}
			<a
				href={tab.href}
				onclick={(e) => handleTabClick(e, tab.href, tab.exact)}
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px {isActive(tab.href, tab.exact)
					? 'border-[--color-accent] text-[--color-accent]'
					: 'border-transparent text-[--color-text-muted] hover:text-[--color-text]'}"
			>
				{tab.label}
			</a>
		{/each}
	</div>

	<!-- oninput/onchange marks the form dirty; onsubmit clears it -->
	<div oninput={markDirty} onchange={markDirty} onsubmit={clearDirty}>
		{@render children()}
	</div>
</div>
