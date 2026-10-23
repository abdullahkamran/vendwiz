<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import { mediaUrl, setMediaBase } from '$lib/media';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Runs before any page renders, so mediaUrl() works in every component
	setMediaBase(data.mediaBase);
</script>

<svelte:head>
	<!-- One icon tag for the whole site: the store's uploaded favicon, else the default -->
	<link rel="icon" href={mediaUrl(data.faviconUrl) ?? '/favicon.svg'} type={data.faviconUrl ? undefined : 'image/svg+xml'} />
</svelte:head>

{@render children()}
