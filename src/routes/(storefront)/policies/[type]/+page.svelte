<script lang="ts">
  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let policy = $derived(data.policy);
  let title = $derived(data.title);
</script>

<svelte:head>
  <title>{title} | {store.name}</title>
  <meta name="description" content="{title} for {store.name}" />
</svelte:head>

<div style="max-width:800px; margin:48px auto; padding:0 24px;">
  <h1 style="font-size:2rem; font-weight:800; color:#111827; margin:0 0 32px;">{title}</h1>

  <div class="policy-content prose" style="color:#374151; line-height:1.8; font-size:0.95rem;">
    {@html policy.content}
  </div>

  <div style="margin-top:48px; padding-top:24px; border-top:1px solid #e5e7eb;">
    <a href="/" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">← Back to store</a>
  </div>
</div>

<style>
  :global(.policy-content h1),
  :global(.policy-content h2),
  :global(.policy-content h3) {
    font-weight: 700;
    margin: 1.5em 0 0.5em;
    color: #111827;
  }
  :global(.policy-content p) { margin: 0 0 1em; }
  :global(.policy-content ul),
  :global(.policy-content ol) { padding-left: 1.5em; margin: 0 0 1em; }
  :global(.policy-content li) { margin-bottom: 0.4em; }
  :global(.policy-content a) { color: var(--store-primary, #111827); }
</style>
