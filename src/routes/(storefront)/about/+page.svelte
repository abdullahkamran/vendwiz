<script lang="ts">
  import Seo from '$lib/components/storefront/Seo.svelte';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');
</script>

<svelte:head>
  <title>{data.title} | {store.name}</title>
</svelte:head>

<Seo {store} title="{data.title} | {store.name}" description="{data.title} — {store.name}" />

<div class="about-wrap">
  <h1 style="font-size:2rem; font-weight:800; color:var(--sf-text); margin:0 0 32px;">{data.title}</h1>

  {#if data.html}
    <div class="about-content" style="color:var(--sf-text); line-height:1.8; font-size:0.95rem;">
      {@html data.html}
    </div>
  {:else}
    <p style="color:var(--sf-muted);">{store.name} hasn't added an About Us page yet. Please check back soon.</p>
  {/if}

  <div style="margin-top:48px; padding-top:24px; border-top:1px solid var(--sf-border);">
    <a href="{basePath || '/'}" style="color:var(--sf-muted); text-decoration:none; font-size:0.875rem;">← Back to store</a>
  </div>
</div>

<style>
  .about-wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 48px 32px;
  }

  :global(.about-content h1),
  :global(.about-content h2),
  :global(.about-content h3) {
    font-weight: 700;
    margin: 1.5em 0 0.5em;
    color: var(--sf-text);
  }
  :global(.about-content p) { margin: 0 0 1em; }
  :global(.about-content ul) { list-style-type: disc; padding-left: 1.5em; margin: 0 0 1em; }
  :global(.about-content ol) { list-style-type: decimal; padding-left: 1.5em; margin: 0 0 1em; }
  :global(.about-content li) { margin-bottom: 0.4em; }
  :global(.about-content a) { color: var(--sf-primary); text-decoration: underline; }
  :global(.about-content strong) { font-weight: 700; }
  :global(.about-content em) { font-style: italic; }
  :global(.about-content img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--sf-radius-lg);
    margin: 0.75em 0;
    display: block;
  }
  :global(.about-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9rem;
    display: block;
    overflow-x: auto;
  }
  :global(.about-content th),
  :global(.about-content td) {
    border: 1px solid var(--sf-border);
    padding: 8px 12px;
    text-align: left;
  }
  :global(.about-content th) {
    background: var(--sf-surface);
    font-weight: 600;
  }
  :global(.about-content blockquote) {
    border-left: 3px solid var(--sf-border);
    margin: 1em 0;
    padding: 0.5em 1em;
    color: var(--sf-muted);
  }
  :global(.about-content hr) {
    border: none;
    border-top: 1px solid var(--sf-border);
    margin: 2em 0;
  }
</style>
