<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { darkMode } from '$lib/stores/darkMode';
  import { themeRootCSS, themeDarkCSS } from '$lib/theme/tokens';
  import { onMount } from 'svelte';

  function customThemeCSS(theme: string, customTheme: unknown): string {
    if (theme !== 'custom' || !customTheme || typeof customTheme !== 'object') return '';
    const ct = customTheme as Record<string, string>;
    const overrides: string[] = [];
    if (ct.primaryColor) overrides.push(`  --sf-primary: ${ct.primaryColor};`);
    if (ct.accentColor) overrides.push(`  --sf-announce-bg: ${ct.accentColor};`);
    if (ct.secondaryColor) overrides.push(`  --sf-surface: ${ct.secondaryColor};`);
    return overrides.length ? `:root {\n${overrides.join('\n')}\n}` : '';
  }

  let { data, children }: {
    data: import('./$types').LayoutData;
    children: import('svelte').Snippet;
  } = $props();

  let store = $derived(data.store);
  let categories = $derived(data.categories ?? []);
  let promoCode = $derived(data.promoCode ?? null);

  // Cart item count
  let itemCount = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));

  // Drawer state
  let drawerOpen = $state(false);
  function openDrawer() { drawerOpen = true; }
  function closeDrawer() { drawerOpen = false; }

  // Dark mode
  let isDark = $derived($darkMode);
  function toggleDark() { darkMode.toggle(); }

  // Install banner (AC-11)
  let showInstall = $state(false);
  let installDismissed = $state(false);
  onMount(() => {
    try {
      const dismissed = localStorage.getItem('vendwiz-install-dismissed') === 'true';
      showInstall = window.matchMedia('(display-mode: browser)').matches && !dismissed;
      installDismissed = dismissed;
    } catch (_) {}
  });
  function dismissInstall() {
    installDismissed = true;
    showInstall = false;
    try { localStorage.setItem('vendwiz-install-dismissed', 'true'); } catch (_) {}
  }

  // Apply data-dark attribute to <html>
  $effect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.setAttribute('data-dark', '1');
      } else {
        document.documentElement.removeAttribute('data-dark');
      }
    }
  });
</script>

<!-- Inject all --sf-* theme CSS variables + dark override into :root.
     Both light and dark rules are emitted as static CSS so SSR and client
     output are identical — avoiding a head hydration mismatch that would
     prevent onclick handlers from binding on first load. -->
<svelte:head>
  {@html `<style>${themeRootCSS(store.theme)}${themeDarkCSS(store.theme)}${customThemeCSS(store.theme, store.customTheme)}</style>`}
</svelte:head>

<!-- Announcement bar -->
{#if store.announcementEnabled && store.announcementText}
  <div
    class="sf-announce"
    style="background:var(--sf-announce-bg); color:var(--sf-announce-text);"
  >
    {store.announcementText}
  </div>
{/if}

<!-- PWA install banner (AC-11) -->
{#if showInstall}
  <div class="sf-install-banner" role="banner">
    <span>📲 Add to Home Screen for a faster experience</span>
    <button class="sf-install-dismiss" onclick={dismissInstall} aria-label="Dismiss install prompt">✕</button>
  </div>
{/if}

<!-- Nav drawer overlay -->
{#if drawerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sf-drawer-overlay" onclick={closeDrawer}></div>
{/if}

<!-- Slide-in nav drawer (AC-3) -->
<nav class="sf-drawer" class:sf-drawer--open={drawerOpen} aria-label="Navigation drawer">
  <div class="sf-drawer-header">
    <span class="sf-drawer-brand">{store.name}</span>
    <button class="sf-drawer-close" onclick={closeDrawer} aria-label="Close menu">✕</button>
  </div>
  <div class="sf-drawer-body">
    <a href="/products" onclick={closeDrawer} class="sf-drawer-link">All Products</a>
    {#each categories as cat}
      <a href="/products?category={cat.id}" onclick={closeDrawer} class="sf-drawer-link">{cat.name}</a>
    {/each}
    <hr class="sf-drawer-sep" />
    <a href="/policies/return" onclick={closeDrawer} class="sf-drawer-link">Return Policy</a>
    <a href="/policies/shipping" onclick={closeDrawer} class="sf-drawer-link">Shipping Info</a>
    <a href="/policies/terms" onclick={closeDrawer} class="sf-drawer-link">Terms &amp; Conditions</a>
    <a href="/policies/faq" onclick={closeDrawer} class="sf-drawer-link">FAQ</a>
    <hr class="sf-drawer-sep" />
    <a href="/track" onclick={closeDrawer} class="sf-drawer-link">Track Order</a>
    <a href="/contact" onclick={closeDrawer} class="sf-drawer-link">Contact Us</a>
  </div>
</nav>

<!-- Header (mobile-first — hamburger only, no horizontal nav bar) -->
<header class="sf-header">
  <div class="sf-container sf-header-inner">
    <!-- Hamburger button (AC-3) -->
    <button class="sf-hamburger" onclick={openDrawer} aria-label="Open menu" aria-expanded={drawerOpen}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="2" y1="5" x2="20" y2="5"/>
        <line x1="2" y1="11" x2="20" y2="11"/>
        <line x1="2" y1="17" x2="20" y2="17"/>
      </svg>
    </button>

    <!-- Logo / wordmark -->
    <a href="/" class="sf-logo">
      {#if store.logoUrl}
        <img src={store.logoUrl} alt={store.name} class="sf-logo-img" />
      {:else}
        <span class="sf-logo-text">{store.name}</span>
      {/if}
    </a>

    <!-- Right controls -->
    <div class="sf-header-actions">
      <!-- Dark mode toggle (AC-2) -->
      <button
        class="sf-icon-btn"
        onclick={toggleDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <!-- Cart -->
      <a href="/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
        🛒
        {#if itemCount > 0}
          <span class="sf-cart-badge">{itemCount}</span>
        {/if}
      </a>
    </div>
  </div>
</header>

<!-- Main content (max-width 560px, horizontally centred — AC-4) -->
<main class="sf-main">
  <div class="sf-container">
    {@render children()}
  </div>
</main>

<!-- Footer -->
<footer class="sf-footer">
  <div class="sf-container sf-footer-inner">
    <div class="sf-footer-col">
      <p class="sf-footer-heading">Follow Us</p>
      <div class="sf-footer-social">
        {#if store.whatsapp}
          <a href="https://wa.me/{store.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp" class="sf-social-link">💬</a>
        {/if}
        {#if store.instagram}
          <a href="https://instagram.com/{store.instagram}" target="_blank" rel="noopener" aria-label="Instagram" class="sf-social-link">📸</a>
        {/if}
        {#if store.facebook}
          <a href="https://facebook.com/{store.facebook}" target="_blank" rel="noopener" aria-label="Facebook" class="sf-social-link">📘</a>
        {/if}
      </div>
    </div>

    <div class="sf-footer-col">
      <p class="sf-footer-heading">Policies</p>
      <a href="/policies/return" class="sf-footer-link">Return Policy</a>
      <a href="/policies/shipping" class="sf-footer-link">Shipping Info</a>
      <a href="/policies/terms" class="sf-footer-link">Terms &amp; Conditions</a>
      <a href="/policies/faq" class="sf-footer-link">FAQ</a>
    </div>

    <div class="sf-footer-col">
      <p class="sf-footer-heading">Help</p>
      <a href="/track" class="sf-footer-link">Track Your Order</a>
      <a href="/contact" class="sf-footer-link">Contact Us</a>
      {#if store.contactEmail}
        <a href="mailto:{store.contactEmail}" class="sf-footer-link">{store.contactEmail}</a>
      {/if}
    </div>
  </div>
  <p class="sf-footer-credit">Powered by <a href="https://vendwiz.com" class="sf-footer-credit-link">VendWiz</a></p>
</footer>

<style>
  /* ── Global reset for storefront ── */
  :global(*, *::before, *::after) { box-sizing: border-box; }

  /* ── Container (AC-4): max-width 560 px, centred ── */
  :global(.sf-container) {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
    padding-inline: 16px;
    box-sizing: border-box;
  }

  /* ── Announcement bar ── */
  .sf-announce {
    text-align: center;
    padding: 8px 16px;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  /* ── Install banner ── */
  .sf-install-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--sf-surface, #f8f9fa);
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    font-size: 0.875rem;
    color: var(--sf-text, #212529);
  }
  .sf-install-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--sf-muted, #6c757d);
    padding: 2px 6px;
    line-height: 1;
  }

  /* ── Drawer overlay ── */
  .sf-drawer-overlay {
    position: fixed;
    inset: 0;
    background: var(--sf-overlay);
    z-index: 40;
  }

  /* ── Slide-in drawer ── */
  .sf-drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(280px, 85vw);
    background: var(--sf-surface, #fff);
    color: var(--sf-text, #212529);
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
    overflow-y: auto;
  }
  .sf-drawer--open {
    transform: translateX(0);
  }
  .sf-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    flex-shrink: 0;
  }
  .sf-drawer-brand {
    font-weight: 700;
    font-size: 1rem;
    font-family: var(--sf-heading-font, system-ui);
    color: var(--sf-primary, #0d6efd);
  }
  .sf-drawer-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
    color: var(--sf-muted, #6c757d);
    padding: 4px;
    line-height: 1;
  }
  .sf-drawer-body {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    flex: 1;
  }
  .sf-drawer-link {
    display: block;
    padding: 12px 20px;
    font-size: 0.9375rem;
    color: var(--sf-text, #212529);
    text-decoration: none;
    transition: background 0.15s;
  }
  .sf-drawer-link:hover {
    background: var(--sf-bg, #f8f9fa);
    color: var(--sf-primary, #0d6efd);
  }
  .sf-drawer-sep {
    border: none;
    border-top: 1px solid var(--sf-border, #dee2e6);
    margin: 6px 0;
  }

  /* ── Header ── */
  .sf-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--sf-surface, #fff);
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .sf-header-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    max-width: 560px;
  }
  .sf-hamburger {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--sf-text, #212529);
    padding: 6px;
    border-radius: var(--sf-radius, 6px);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .sf-logo {
    flex: 1;
    text-decoration: none;
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }
  .sf-logo-img {
    height: 32px;
    object-fit: contain;
  }
  .sf-logo-text {
    font-size: 1.1rem;
    font-weight: 700;
    font-family: var(--sf-heading-font, system-ui);
    color: var(--sf-primary, #0d6efd);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sf-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .sf-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 6px;
    border-radius: var(--sf-radius, 6px);
    color: var(--sf-text, #212529);
    display: flex;
    align-items: center;
  }
  .sf-cart-btn {
    position: relative;
    text-decoration: none;
    color: var(--sf-text, #212529);
    font-size: 1.25rem;
    padding: 6px;
    display: flex;
    align-items: center;
  }
  .sf-cart-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    line-height: 1;
  }

  /* ── Main ── */
  .sf-main {
    background: var(--sf-bg, #fff);
    min-height: 60vh;
    color: var(--sf-text, #212529);
  }

  /* ── Footer ── */
  .sf-footer {
    background: var(--sf-surface, #f8f9fa);
    border-top: 1px solid var(--sf-border, #dee2e6);
    padding: 32px 0 16px;
    color: var(--sf-text, #212529);
  }
  .sf-footer-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .sf-footer-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 120px;
  }
  .sf-footer-heading {
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0 0 4px;
    color: var(--sf-text, #212529);
  }
  .sf-footer-link {
    color: var(--sf-muted, #6c757d);
    text-decoration: none;
    font-size: 0.8125rem;
    transition: color 0.15s;
  }
  .sf-footer-link:hover {
    color: var(--sf-primary, #0d6efd);
  }
  .sf-footer-social {
    display: flex;
    gap: 12px;
  }
  .sf-social-link {
    font-size: 1.5rem;
    text-decoration: none;
  }
  .sf-footer-credit {
    text-align: center;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
    margin: 0;
  }
  .sf-footer-credit-link {
    color: var(--sf-muted, #6c757d);
    text-decoration: none;
  }
  .sf-footer-credit-link:hover {
    color: var(--sf-primary, #0d6efd);
  }
</style>
