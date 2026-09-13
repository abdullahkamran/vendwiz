<script lang="ts">
  import { cart } from '$lib/stores/cart';

  let { data, children }: {
    data: import('./$types').LayoutData;
    children: import('svelte').Snippet;
  } = $props();

  let store = $derived(data.store);
  let categories = $derived(data.categories ?? []);

  // Cart item count
  let itemCount = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));

  // Theme color: use custom hex or derive from theme preset
  const themeColors: Record<string, string> = {
    minimal: '#111827',
    bold: '#7c3aed',
    playful: '#f59e0b'
  };
  let primaryColor = $derived(store.themeCustomHex ?? themeColors[store.theme] ?? '#111827');

  let searchOpen = $state(false);
  let searchQuery = $state('');

  function openSearch() { searchOpen = true; }
  function closeSearch() { searchOpen = false; searchQuery = ''; }
  function handleSearchSubmit() {
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  }
</script>

<!-- Inject store theme CSS vars -->
<svelte:head>
  <style>
    :root {
      --store-primary: {primaryColor};
    }
  </style>
</svelte:head>

<!-- Announcement bar -->
{#if store.announcementBarEnabled && store.announcementBarText}
  <div
    class="announcement-bar"
    style="background: var(--store-primary, #111827); color: #fff; text-align:center; padding:8px 16px; font-size:0.875rem;"
  >
    {store.announcementBarText}
  </div>
{/if}

<!-- Header -->
<header class="storefront-header" style="border-bottom:1px solid #e5e7eb; background:#fff;">
  <div
    style="max-width:1280px; margin:0 auto; display:flex; align-items:center; gap:16px; padding:12px 24px;"
  >
    <!-- Logo / wordmark -->
    <a href="/" style="text-decoration:none; flex-shrink:0;">
      {#if store.logoUrl}
        <img src={store.logoUrl} alt={store.name} style="height:40px; object-fit:contain;" />
      {:else}
        <span style="font-size:1.25rem; font-weight:700; color: var(--store-primary, #111827);">{store.name}</span>
      {/if}
    </a>

    <!-- Nav categories -->
    <nav style="display:flex; gap:12px; flex:1; margin-left:24px;">
      <a href="/products" style="font-size:0.9rem; color:#374151; text-decoration:none;">
        All Products
      </a>
      {#each categories.filter((c) => !c.parentId) as cat}
        <a
          href="/products?category={cat.id}"
          style="font-size:0.9rem; color:#374151; text-decoration:none;">{cat.name}</a
        >
      {/each}
    </nav>

    <!-- Search -->
    <div style="position:relative;">
      {#if searchOpen}
        <form onsubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }} style="display:flex; gap:8px;">
          <!-- svelte-ignore a11y_autofocus -->
          <input
            autofocus
            bind:value={searchQuery}
            placeholder="Search products…"
            style="border:1px solid #d1d5db; border-radius:6px; padding:6px 12px; font-size:0.875rem; width:200px;"
          />
          <button type="submit" style="padding:6px 12px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:6px; cursor:pointer;">Go</button>
          <button type="button" onclick={closeSearch} style="background:none; border:none; cursor:pointer;">✕</button>
        </form>
      {:else}
        <button
          onclick={openSearch}
          aria-label="Search"
          style="background:none; border:none; cursor:pointer; font-size:1.25rem; color:#374151;"
        >
          🔍
        </button>
      {/if}
    </div>

    <!-- Cart icon -->
    <a href="/cart" style="position:relative; text-decoration:none; color:#374151; font-size:1.4rem;">
      🛒
      {#if itemCount > 0}
        <span
          style="position:absolute; top:-8px; right:-8px; background:var(--store-primary,#111827); color:#fff; border-radius:50%; width:18px; height:18px; font-size:0.65rem; display:flex; align-items:center; justify-content:center; font-weight:700;"
        >
          {itemCount}
        </span>
      {/if}
    </a>
  </div>
</header>

<!-- Page content -->
<main>
  {@render children()}
</main>

<!-- Footer -->
<footer style="border-top:1px solid #e5e7eb; margin-top:64px; background:#f9fafb; padding:40px 24px;">
  <div style="max-width:1280px; margin:0 auto; display:flex; flex-wrap:wrap; gap:32px; justify-content:space-between;">
    <!-- Social icons -->
    <div>
      <p style="font-weight:600; margin-bottom:12px;">Follow us</p>
      <div style="display:flex; gap:16px;">
        {#if store.whatsapp}
          <a href="https://wa.me/{store.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp" style="color:#25D366; font-size:1.5rem;">💬</a>
        {/if}
        {#if store.instagram}
          <a href="https://instagram.com/{store.instagram}" target="_blank" rel="noopener" aria-label="Instagram" style="color:#E1306C; font-size:1.5rem;">📸</a>
        {/if}
        {#if store.facebook}
          <a href="https://facebook.com/{store.facebook}" target="_blank" rel="noopener" aria-label="Facebook" style="color:#1877F2; font-size:1.5rem;">📘</a>
        {/if}
      </div>
    </div>

    <!-- Policy links -->
    <div>
      <p style="font-weight:600; margin-bottom:12px;">Policies</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="/policies/return" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">Return Policy</a>
        <a href="/policies/shipping" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">Shipping Info</a>
        <a href="/policies/terms" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">Terms &amp; Conditions</a>
        <a href="/policies/faq" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">FAQ</a>
      </div>
    </div>

    <!-- Track / contact -->
    <div>
      <p style="font-weight:600; margin-bottom:12px;">Help</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="/track" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">Track Your Order</a>
        {#if store.contactEmail}
          <a href="mailto:{store.contactEmail}" style="color:#6b7280; text-decoration:none; font-size:0.875rem;">{store.contactEmail}</a>
        {/if}
      </div>
    </div>
  </div>

  <div style="text-align:center; margin-top:32px; color:#9ca3af; font-size:0.75rem;">
    Powered by <a href="https://vendwiz.com" style="color:#9ca3af;">VendWiz</a>
  </div>
</footer>
