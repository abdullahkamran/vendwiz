<script lang="ts">
  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let title = $derived(data.title);
</script>

<svelte:head>
  <title>{title} | {store.name}</title>
  <meta name="description" content="{title} for {store.name}" />
</svelte:head>

<div style="max-width:800px; margin:48px auto; padding:0 24px;">
  <h1 style="font-size:2rem; font-weight:800; color:var(--sf-text); margin:0 0 32px;">{title}</h1>

  <div class="policy-content prose" style="color:var(--sf-text); line-height:1.8; font-size:0.95rem;">
    {@html data.html}
  </div>

  <div style="margin-top:48px; padding-top:24px; border-top:1px solid var(--sf-border);">
    <a href="/" style="color:var(--sf-muted); text-decoration:none; font-size:0.875rem;">← Back to store</a>
  </div>
</div>

<style>
  :global(.policy-content h1),
  :global(.policy-content h2),
  :global(.policy-content h3) {
    font-weight: 700;
    margin: 1.5em 0 0.5em;
    color: var(--sf-text);
  }
  :global(.policy-content p) { margin: 0 0 1em; }
  :global(.policy-content ul),
  :global(.policy-content ol) { padding-left: 1.5em; margin: 0 0 1em; }
  :global(.policy-content li) { margin-bottom: 0.4em; }
  :global(.policy-content a) { color: var(--sf-primary); }
  :global(.policy-content strong) { font-weight: 700; }
  :global(.policy-content em) { font-style: italic; }
  :global(.policy-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9rem;
  }
  :global(.policy-content th),
  :global(.policy-content td) {
    border: 1px solid var(--sf-border);
    padding: 8px 12px;
    text-align: left;
  }
  :global(.policy-content th) {
    background: var(--sf-surface);
    font-weight: 600;
    color: var(--sf-text);
  }
  :global(.policy-content td) {
    color: var(--sf-text);
  }
  :global(.policy-content blockquote) {
    border-left: 3px solid var(--sf-border);
    margin: 1em 0;
    padding: 0.5em 1em;
    color: var(--sf-muted);
  }
  :global(.policy-content code) {
    background: var(--sf-surface);
    border: 1px solid var(--sf-border);
    border-radius: var(--sf-radius);
    padding: 1px 5px;
    font-size: 0.875em;
  }
  :global(.policy-content pre) {
    background: var(--sf-surface);
    border: 1px solid var(--sf-border);
    border-radius: var(--sf-radius);
    padding: 1em;
    overflow-x: auto;
  }
  :global(.policy-content hr) {
    border: none;
    border-top: 1px solid var(--sf-border);
    margin: 2em 0;
  }
</style>
