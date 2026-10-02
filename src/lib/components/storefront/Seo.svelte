<script lang="ts">
  import { page } from '$app/stores';
  import { buildSeo } from '$lib/seo';
  import type { SeoProps } from '$lib/seo';

  let {
    store,
    title = null,
    description = null,
    image = null,
    type = 'website',
    card = 'summary',
    noindex = false,
    jsonLd = null
  }: {
    store: SeoProps['store'];
    title?: string | null;
    description?: string | null;
    image?: string | null;
    type?: string;
    card?: 'summary' | 'summary_large_image';
    noindex?: boolean;
    jsonLd?: string | null;
  } = $props();

  let tags = $derived(
    buildSeo({ url: $page.url, store, title, description, image, type, card })
  );
</script>

<svelte:head>
  <link rel="canonical" href={tags.canonical} />
  <meta name="description" content={tags.description} />
  {#if noindex}
    <meta name="robots" content="noindex" />
  {/if}
  <meta property="og:title" content={tags.ogTitle} />
  <meta property="og:description" content={tags.ogDescription} />
  <meta property="og:url" content={tags.ogUrl} />
  <meta property="og:type" content={tags.ogType} />
  <meta property="og:site_name" content={tags.ogSiteName} />
  <meta property="og:image" content={tags.ogImage} />
  <meta name="twitter:card" content={tags.twitterCard} />
  <meta name="twitter:title" content={tags.twitterTitle} />
  <meta name="twitter:description" content={tags.twitterDescription} />
  {#if jsonLd}
    {@html `<script type="application/ld+json">${jsonLd}<\/script>`}
  {/if}
</svelte:head>
