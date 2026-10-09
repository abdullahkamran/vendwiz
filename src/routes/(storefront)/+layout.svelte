<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { darkMode } from '$lib/stores/darkMode';
  import { themeRootCSS, themeDarkCSS } from '$lib/theme/tokens';
  import { themeColorFor } from '$lib/seo';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { buildCategoryTree } from '$lib/utils/category-tree';

  // Strict allow-list guard for CSS color values injected via the html style tag
  // in svelte:head.  Any value that does not match a recognised color syntax is
  // silently dropped, preventing a stored-XSS escape where a rogue theme value
  // could break out of the style block.
  // Accepted forms: #rgb/#rrggbb/#rgba/#rrggbbaa, rgb()/rgba(),
  // hsl()/hsla(), or a plain alphabetic named color (e.g. "red").
  function isSafeCSSColor(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    return (
      /^#[0-9a-fA-F]{3,8}$/.test(value) ||
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(value) ||
      /^hsla?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?%\s*,\s*\d+(?:\.\d+)?%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(value) ||
      /^[a-zA-Z]{2,30}$/.test(value)
    );
  }

  function customThemeCSS(theme: string, customTheme: unknown): string {
    if (theme !== 'custom' || !customTheme || typeof customTheme !== 'object') return '';
    const ct = customTheme as Record<string, string>;
    const overrides: string[] = [];
    if (ct.primaryColor && isSafeCSSColor(ct.primaryColor)) overrides.push(`  --sf-primary: ${ct.primaryColor};`);
    if (ct.accentColor && isSafeCSSColor(ct.accentColor)) overrides.push(`  --sf-announce-bg: ${ct.accentColor};`);
    if (ct.secondaryColor && isSafeCSSColor(ct.secondaryColor)) overrides.push(`  --sf-surface: ${ct.secondaryColor};`);
    return overrides.length ? `:root {\n${overrides.join('\n')}\n}` : '';
  }

  let { data, children }: {
    data: import('./$types').LayoutData;
    children: import('svelte').Snippet;
  } = $props();

  let store = $derived(data.store);
  let categories = $derived(data.categories ?? []);
  let promoCode = $derived(data.promoCode ?? null);
  let basePath = $derived(data.basePath ?? '');

  // Build parent→children tree for hierarchical nav rendering
  let categoryTree = $derived(buildCategoryTree(categories));

  // Cart item count
  let itemCount = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));

  // Drawer state
  let drawerOpen = $state(false);
  function openDrawer() { drawerOpen = true; }
  function closeDrawer() { drawerOpen = false; }

  // Drawer category expand/collapse state: { categoryId: boolean }
  let expanded = $state<Record<string, boolean>>({});
  function toggleExpanded(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    expanded[id] = !expanded[id];
  }

  // Dark mode
  let isDark = $derived($darkMode);
  function toggleDark() { darkMode.toggle(); }

  // Desktop breakpoint state — SSR-safe: false on server, set in onMount, kept in sync via resize
  let isDesktop = $state(false);

  // Active nav helpers (reactive to SvelteKit navigation)
  let pathname = $derived($page.url.pathname);
  let catParam = $derived($page.url.searchParams.get('category') ?? '');
  // Strip basePath prefix so active-link checks work for both subdomain and path-based access
  let localPathname = $derived(
    basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname
  );

  // Install banner (AC-11)
  let showInstall = $state(false);
  let installDismissed = $state(false);
  let deferredPrompt = $state<any>(null);
  onMount(() => {
    // Desktop detection
    isDesktop = window.innerWidth >= 1024;
    function onResize() { isDesktop = window.innerWidth >= 1024; }
    window.addEventListener('resize', onResize);

    // Capture the browser install prompt for the Install button (Chrome/Android)
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      deferredPrompt = e;
      if (!installDismissed) showInstall = true;
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  });
  function dismissInstall() {
    installDismissed = true;
    showInstall = false;
  }
  async function installApp() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      dismissInstall();
    } catch (_) {}
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
     output are identical — avoiding a head hydration mismatch. -->
<svelte:head>
  {@html `<style>${themeRootCSS(store.theme)}${themeDarkCSS(store.theme)}${customThemeCSS(store.theme, store.customTheme)}</style>`}
  <meta name="theme-color" content={themeColorFor(store)} />
  <link rel="manifest" href="/manifest.json{basePath ? `?base=${encodeURIComponent(basePath)}` : ''}">
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
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
    {#if deferredPrompt}
      <button class="sf-install-btn" onclick={installApp}>Install</button>
    {/if}
    <button class="sf-install-dismiss" onclick={dismissInstall} aria-label="Dismiss install prompt">✕</button>
  </div>
{/if}

<!-- Nav drawer overlay (mobile) -->
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
    <a href="{basePath}/products" onclick={closeDrawer} class="sf-drawer-link">All Products</a>
    {#each categoryTree as cat}
      <div class="sf-drawer-cat-row">
        <a href="{basePath}/products?category={cat.id}" onclick={closeDrawer} class="sf-drawer-link sf-drawer-cat-link">{cat.name}</a>
        {#if cat.children.length > 0}
          <button
            class="sf-drawer-chevron"
            onclick={(e) => toggleExpanded(cat.id, e)}
            aria-label="{expanded[cat.id] ? 'Collapse' : 'Expand'} {cat.name} subcategories"
            aria-expanded={expanded[cat.id] ?? false}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="transition:transform 0.2s; transform:rotate({expanded[cat.id] ? '90deg' : '0deg'});">
              <polyline points="4,2 10,7 4,12"/>
            </svg>
          </button>
        {/if}
      </div>
      {#if expanded[cat.id]}
        {#each cat.children as child}
          <a href="{basePath}/products?category={child.id}" onclick={closeDrawer} class="sf-drawer-link sf-drawer-sublink">{child.name}</a>
        {/each}
      {/if}
    {/each}
    <hr class="sf-drawer-sep" />
    <a href="{basePath}/policies/return" onclick={closeDrawer} class="sf-drawer-link">Return Policy</a>
    <a href="{basePath}/policies/shipping" onclick={closeDrawer} class="sf-drawer-link">Shipping Info</a>
    <a href="{basePath}/policies/terms" onclick={closeDrawer} class="sf-drawer-link">Terms &amp; Conditions</a>
    <a href="{basePath}/policies/faq" onclick={closeDrawer} class="sf-drawer-link">FAQ</a>
    <hr class="sf-drawer-sep" />
    <a href="{basePath}/track" onclick={closeDrawer} class="sf-drawer-link">Track Order</a>
    <a href="{basePath}/contact" onclick={closeDrawer} class="sf-drawer-link">Contact Us</a>
  </div>
</nav>

<!-- Header: mobile (hamburger) or desktop (3-column grid) -->
<header class="sf-header">
  {#if isDesktop}
    <!-- Desktop: 3-col grid — logo+nav left / brand centre / search+actions right.
         When theme===minimal the dhCentered variant puts search in the left column. -->
    <div class="sf-container sf-header-inner sf-header-desktop"
      class:sf-header-centered={store.theme === 'minimal'}>
      {#if store.theme === 'minimal'}
        <!-- dhCentered: search left / brand centre / actions right -->
        <div class="sf-dh-col sf-dh-left">
          <form method="GET" action="{basePath}/products" class="sf-dh-search-wrap">
            <input type="search" name="q" placeholder="Search products…"
              class="sf-dh-search" aria-label="Search products" />
          </form>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-logo">
            {#if store.logoUrl}
              <img src={store.logoUrl} alt={store.name} class="sf-logo-img" />
            {:else}
              <span class="sf-logo-text">{store.name}</span>
            {/if}
          </a>
        </div>
        <div class="sf-dh-col sf-dh-right">
          <button class="sf-icon-btn" onclick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            🛒
            {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
          </a>
        </div>
      {:else}
        <!-- Standard: logo+nav left / brand name centre / search+actions right -->
        <div class="sf-dh-col sf-dh-left">
          <a href="{basePath || '/'}" class="sf-logo sf-dh-logo">
            {#if store.logoUrl}
              <img src={store.logoUrl} alt={store.name} class="sf-logo-img" />
            {:else}
              <span class="sf-logo-text">{store.name}</span>
            {/if}
          </a>
          <nav class="sf-dh-nav" aria-label="Main navigation">
            <a href="{basePath || '/'}"
              class="sf-dh-navlink"
              class:sf-dh-navlink--active={localPathname === '/'}
            >Home</a>
            <a href="{basePath}/products"
              class="sf-dh-navlink"
              class:sf-dh-navlink--active={localPathname === '/products' && !catParam}
            >All Products</a>
            {#each categoryTree as cat}
              <a href="{basePath}/products?category={cat.id}"
                class="sf-dh-navlink"
                class:sf-dh-navlink--active={localPathname === '/products' && catParam === cat.id}
              >{cat.name}</a>
              {#each cat.children as child}
                <a href="{basePath}/products?category={child.id}"
                  class="sf-dh-navlink sf-dh-navlink--sub"
                  class:sf-dh-navlink--active={localPathname === '/products' && catParam === child.id}
                >{child.name}</a>
              {/each}
            {/each}
          </nav>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-dh-brand-link">
            {#if store.logoUrl}
              <img src={store.logoUrl} alt={store.name} class="sf-logo-img" />
            {:else}
              <span class="sf-logo-text">{store.name}</span>
            {/if}
          </a>
        </div>
        <div class="sf-dh-col sf-dh-right">
          <form method="GET" action="{basePath}/products" class="sf-dh-search-wrap">
            <input type="search" name="q" placeholder="Search products…"
              class="sf-dh-search" aria-label="Search products" />
          </form>
          <button class="sf-icon-btn" onclick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            🛒
            {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
          </a>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Mobile: hamburger / logo / actions -->
    <div class="sf-container sf-header-inner">
      <button class="sf-hamburger" onclick={openDrawer} aria-label="Open menu" aria-expanded={drawerOpen}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="2" y1="5" x2="20" y2="5"/>
          <line x1="2" y1="11" x2="20" y2="11"/>
          <line x1="2" y1="17" x2="20" y2="17"/>
        </svg>
      </button>
      <a href="{basePath || '/'}" class="sf-logo">
        {#if store.logoUrl}
          <img src={store.logoUrl} alt={store.name} class="sf-logo-img" />
        {:else}
          <span class="sf-logo-text">{store.name}</span>
        {/if}
      </a>
      <div class="sf-header-actions">
        <button class="sf-icon-btn" onclick={toggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? '☀️' : '🌙'}
        </button>
        <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
          🛒
          {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
        </a>
      </div>
    </div>
  {/if}
</header>

<!-- Main content -->
<main class="sf-main">
  <div class="sf-container">
    {@render children()}
  </div>
</main>

<!-- Footer -->
<footer class="sf-footer">
  <div class="sf-container sf-footer-inner">
    <!-- Brand column: hidden on mobile, first of 4 cols on desktop -->
    <div class="sf-footer-col sf-footer-brand-col">
      <a href="{basePath || '/'}" class="sf-footer-brand-link">
        {#if store.logoUrl}
          <img src={store.logoUrl} alt={store.name} class="sf-footer-brand-logo" />
        {:else}
          <span class="sf-footer-brand-name">{store.name}</span>
        {/if}
      </a>
    </div>

    <div class="sf-footer-col">
      <p class="sf-footer-heading">Follow Us</p>
      <div class="sf-footer-social">
        {#if store.whatsapp}
          <a href="https://wa.me/{store.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.549 4.116 1.516 5.843L.057 23.428a.5.5 0 00.614.614l5.601-1.463A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.999-1.371l-.358-.213-3.716.971.991-3.625-.234-.372A9.796 9.796 0 012.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/></svg>
          </a>
        {/if}
        {#if store.instagram}
          <a href="https://instagram.com/{store.instagram}" target="_blank" rel="noopener" aria-label="Instagram" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
        {/if}
        {#if store.facebook}
          <a href="https://facebook.com/{store.facebook}" target="_blank" rel="noopener" aria-label="Facebook" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        {/if}
      </div>
    </div>

    <div class="sf-footer-col">
      <a href="{basePath}/policies/return" class="sf-footer-link">Return Policy</a>
      <a href="{basePath}/policies/shipping" class="sf-footer-link">Shipping Info</a>
      <a href="{basePath}/policies/terms" class="sf-footer-link">Terms &amp; Conditions</a>
      <a href="{basePath}/policies/faq" class="sf-footer-link">FAQ</a>
    </div>

    <div class="sf-footer-col">
      <a href="{basePath}/track" class="sf-footer-link">Track Your Order</a>
      <a href="{basePath}/contact" class="sf-footer-link">Contact Us</a>
      {#if store.contactEmail}
        <a href="mailto:{store.contactEmail}" class="sf-footer-link">{store.contactEmail}</a>
      {/if}
    </div>
  </div>
  <p class="sf-footer-credit">Powered by <a href="https://vendwiz.com" class="sf-footer-credit-link">VendWiz</a></p>
</footer>

<!-- Theme switcher: fixed bottom-right on desktop only. -->
<button
  class="sf-theme-switcher"
  onclick={toggleDark}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {isDark ? '☀️' : '🌙'}
</button>

<style>
  /* ── Global reset for storefront ── */
  :global(*, *::before, *::after) { box-sizing: border-box; }

  /* ── Container: 560 px mobile → 1240 px desktop ── */
  :global(.sf-container) {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
    padding-inline: 16px;
    box-sizing: border-box;
  }
  @media (min-width: 1024px) {
    :global(.sf-container) {
      max-width: 1240px;
      padding-inline: 32px;
    }
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
  .sf-install-btn {
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    border: none;
    border-radius: var(--sf-radius, 6px);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 4px 12px;
    line-height: 1.4;
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
  /* Parent category row: link + optional chevron toggle */
  .sf-drawer-cat-row {
    display: flex;
    align-items: center;
  }
  .sf-drawer-cat-link {
    flex: 1;
  }
  .sf-drawer-chevron {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 12px;
    color: var(--sf-muted, #6c757d);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .sf-drawer-chevron:hover { color: var(--sf-primary, #0d6efd); }

  /* Child categories: indented under their parent */
  .sf-drawer-sublink {
    padding-left: 36px;
    font-size: 0.875rem;
    color: var(--sf-muted, #6c757d);
  }
  .sf-drawer-sublink:hover {
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
    z-index: 20;
    background: var(--sf-surface, #fff);
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }

  /* Mobile header inner.
     max-width is intentionally absent here: .sf-container already carries
     560 px on mobile and 1240 px on desktop.  A scoped rule here would win
     the specificity race against :global(.sf-container) and cap the desktop
     header at 560 px, violating AC-2. */
  .sf-header-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
  }

  /* Desktop header inner: 3-col grid */
  .sf-header-desktop {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 24px;
    height: 72px;
    align-items: center;
    /* max-width and padding-inline come from .sf-container at ≥1024 px */
  }

  /* Desktop header column base */
  .sf-dh-col {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .sf-dh-left {
    gap: 16px;
    overflow: hidden;
  }
  .sf-dh-center {
    justify-content: center;
    flex-shrink: 0;
  }
  .sf-dh-right {
    gap: 8px;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  /* Desktop logo (left column — no flex:1 stretch) */
  .sf-dh-logo {
    flex: 0 0 auto;
    text-decoration: none;
    display: flex;
    align-items: center;
  }

  /* Desktop nav links */
  .sf-dh-nav {
    display: flex;
    align-items: center;
    gap: 2px;
    overflow: hidden;
    flex-wrap: nowrap;
  }
  .sf-dh-navlink {
    text-decoration: none;
    color: var(--sf-text, #212529);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 6px 10px;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    line-height: 1.2;
  }
  .sf-dh-navlink:hover { color: var(--sf-primary, #0d6efd); }
  .sf-dh-navlink--active {
    color: var(--sf-primary, #0d6efd);
    border-bottom-color: var(--sf-primary, #0d6efd);
  }
  /* Child category links in the desktop nav: slightly smaller and muted */
  .sf-dh-navlink--sub {
    font-size: 0.8125rem;
    color: var(--sf-muted, #6c757d);
  }
  .sf-dh-navlink--sub:hover { color: var(--sf-primary, #0d6efd); }

  /* Desktop header search */
  .sf-dh-search-wrap { display: flex; }
  .sf-dh-search {
    width: 180px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    padding: 7px 12px;
    font-size: 0.8125rem;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    outline: none;
  }
  .sf-dh-search:focus { border-color: var(--sf-primary, #0d6efd); }

  /* Desktop centre column brand link */
  .sf-dh-brand-link {
    text-decoration: none;
    display: flex;
    align-items: center;
  }

  /* ── Mobile header elements ── */
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

  /* ── Main: 84 px bottom padding on mobile (nav-bar gap), 0 on desktop ── */
  .sf-main {
    background: var(--sf-bg, #fff);
    min-height: 60vh;
    color: var(--sf-text, #212529);
    padding-bottom: 84px;
  }
  @media (min-width: 1024px) {
    .sf-main { padding-bottom: 0; }
  }

  /* ── Footer ── */
  .sf-footer {
    background: var(--sf-surface, #f8f9fa);
    border-top: 1px solid var(--sf-border, #dee2e6);
    padding: 32px 0 16px;
    color: var(--sf-text, #212529);
  }

  /* Mobile: 3-col flex (brand col hidden) */
  .sf-footer-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  /* Desktop: 4-col grid — brand + 3 link cols */
  @media (min-width: 1024px) {
    .sf-footer-inner {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr));
      gap: 40px;
    }
    .sf-footer-brand-col {
      display: flex !important; /* override the mobile display:none */
    }
  }

  /* Brand col: hidden on mobile, shown on desktop via media query above */
  .sf-footer-brand-col {
    display: none;
    flex-direction: column;
    gap: 8px;
  }
  .sf-footer-brand-link { text-decoration: none; }
  .sf-footer-brand-logo {
    height: 36px;
    object-fit: contain;
  }
  .sf-footer-brand-name {
    font-size: 1.1rem;
    font-weight: 700;
    font-family: var(--sf-heading-font, system-ui);
    color: var(--sf-primary, #0d6efd);
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
  .sf-footer-link:hover { color: var(--sf-primary, #0d6efd); }
  .sf-footer-social {
    display: flex;
    gap: 12px;
  }
  .sf-social-link { font-size: 1.5rem; text-decoration: none; color: var(--sf-muted, #6c757d); }
  .sf-social-link:hover { color: var(--sf-primary, #0d6efd); }
  .sf-social-link svg { width: 22px; height: 22px; display: block; }
  .sf-footer-credit {
    text-align: center;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
    margin: 0;
  }
  .sf-footer-credit-link { color: var(--sf-muted, #6c757d); text-decoration: none; }
  .sf-footer-credit-link:hover { color: var(--sf-primary, #0d6efd); }

  /* ── Theme switcher: fixed bottom-right on desktop only ── */
  .sf-theme-switcher {
    display: none; /* hidden on mobile — header already has the toggle */
  }
  @media (min-width: 1024px) {
    .sf-theme-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--sf-border, #dee2e6);
      background: var(--sf-surface, #fff);
      color: var(--sf-text, #212529);
      font-size: 1.25rem;
      cursor: pointer;
      z-index: 40;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      transition: box-shadow 0.15s;
    }
    .sf-theme-switcher:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    }
  }
</style>
