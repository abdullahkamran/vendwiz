<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<!-- One icon tag for the whole site: the store's uploaded favicon, else the default -->
	<link rel="icon" href={data.faviconUrl ?? '/favicon.svg'} type={data.faviconUrl ? undefined : 'image/svg+xml'} />
</svelte:head>

{@render children()}
