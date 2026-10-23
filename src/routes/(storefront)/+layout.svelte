<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { cart } from '$lib/stores/cart';
  import { darkMode } from '$lib/stores/darkMode';
  import { themeRootCSS, themeDarkCSS } from '$lib/theme/tokens';
  import { themeColorFor } from '$lib/seo';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
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
    if (ct.primaryColor && isSafeCSSColor(ct.primaryColor)) {
      overrides.push(`  --sf-primary: ${ct.primaryColor};`);
      overrides.push(`  --sf-hero-bg: ${ct.primaryColor};`);
    }
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

  // Mobile search panel (opened from the header or bottom nav search icons)
  let searchOpen = $state(false);
  let searchInput = $state<HTMLInputElement | null>(null);
  function openSearch() {
    searchOpen = true;
    drawerOpen = false;
    // Focus after the panel renders
    setTimeout(() => searchInput?.focus(), 0);
  }
  function toggleSearch() {
    if (searchOpen) searchOpen = false;
    else openSearch();
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

  // Installed app (PWA launched from the home screen) vs. regular browser tab.
  // In the app Reels is the landing page and comes first in every menu; on the web Home comes first.
  let isApp = $state(false);
  // Without any reels the Reels item is hidden everywhere and Home is the landing page.
  let hasReels = $derived(data.hasReels ?? false);
  let primaryOrder = $derived<readonly ('home' | 'reels')[]>(
    !hasReels ? ['home'] : isApp ? ['reels', 'home'] : ['home', 'reels']
  );
  let onReels = $derived(localPathname === '/reels');
  // Reels is immersive (mobile and desktop): black header, banners, bottom nav and page; logo hidden
  let immersive = $derived(onReels);

  // Close the mobile search panel whenever the route changes
  $effect(() => {
    void $page.url.href;
    searchOpen = false;
  });

  // Install banner (AC-11)
  let showInstall = $state(false);
  let installDismissed = $state(false);
  let deferredPrompt = $state<any>(null);
  onMount(() => {
    // Desktop detection
    isDesktop = window.innerWidth >= 1024;

    isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // The app opens on Reels. The manifest's start_url already points there; this also covers
    // installs made before that change. Only on launch, so tapping Home later still works.
    if (isApp && hasReels && localPathname === '/') {
      try {
        if (!sessionStorage.getItem('vw-app-launched')) {
          sessionStorage.setItem('vw-app-launched', '1');
          goto(`${basePath}/reels`, { replaceState: true });
        }
      } catch (_) {}
    } else if (isApp) {
      try { sessionStorage.setItem('vw-app-launched', '1'); } catch (_) {}
    }

    function onResize() { isDesktop = window.innerWidth >= 1024; }
    window.addEventListener('resize', onResize);

    // Capture the browser install prompt for the Install button (Chrome/Android)
    // The event is captured by an inline script in app.html (it can fire before hydration).
    function pickUpPrompt() {
      const e = (window as any).__installPrompt;
      if (!e) return;
      deferredPrompt = e;
      if (!installDismissed) showInstall = true;
    }
    pickUpPrompt();
    window.addEventListener('vendwiz:installprompt', pickUpPrompt);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('vendwiz:installprompt', pickUpPrompt);
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
      (window as any).__installPrompt = null;
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

  // Reels: black page background behind everything (incl. the overscroll / bounce area)
  $effect(() => {
    document.documentElement.toggleAttribute('data-reels', immersive);
    return () => document.documentElement.removeAttribute('data-reels');
  });
</script>

<!-- Inject all --sf-* theme CSS variables + dark override into :root.
     Both light and dark rules are emitted as static CSS so SSR and client
     output are identical — avoiding a head hydration mismatch. -->
<svelte:head>
  {@html `<style>${themeRootCSS(store.theme)}${themeDarkCSS(store.theme)}${customThemeCSS(store.theme, store.customTheme)}</style>`}
  <meta name="theme-color" content={immersive ? '#000000' : themeColorFor(store)} />
  <link rel="manifest" href="/manifest.json{basePath ? `?base=${encodeURIComponent(basePath)}` : ''}">
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</svelte:head>

<!-- Minimal outline icons shared by the header and the mobile bottom nav -->
{#snippet iconSearch()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>
  </svg>
{/snippet}
{#snippet iconBag()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
  </svg>
{/snippet}
{#snippet iconHome()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>
  </svg>
{/snippet}
{#snippet iconShop()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/>
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>
  </svg>
{/snippet}
{#snippet iconReels()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18"/><path d="m8 3 2.5 5M13.5 3 16 8"/><path d="M10 12v5l4.5-2.5z"/>
  </svg>
{/snippet}
<!-- Home + Reels for the desktop header, ordered by app/web (see primaryOrder) -->
{#snippet desktopPrimaryLinks()}
  {#each primaryOrder as key}
    {#if key === 'home'}
      <a href="{basePath || '/'}" class="sf-dh-navlink" class:sf-dh-navlink--active={localPathname === '/'}>Home</a>
    {:else}
      <a href="{basePath}/reels" class="sf-dh-navlink" class:sf-dh-navlink--active={onReels}>Reels</a>
    {/if}
  {/each}
{/snippet}
{#snippet iconMoon()}
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>
  </svg>
{/snippet}
{#snippet iconSun()}
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
  </svg>
{/snippet}

<!-- Announcement bar -->
{#if store.announcementEnabled && store.announcementText}
  <div class="sf-announce" class:sf-announce--immersive={immersive}>
    {store.announcementText}
  </div>
{/if}

<!-- PWA install banner (AC-11) -->
{#if showInstall}
  <div class="sf-install-banner" class:sf-install-banner--immersive={immersive} role="banner">
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
    {#each primaryOrder as key}
      {#if key === 'home'}
        <a href="{basePath || '/'}" onclick={closeDrawer} class="sf-drawer-link">Home</a>
      {:else}
        <a href="{basePath}/reels" onclick={closeDrawer} class="sf-drawer-link">Reels</a>
      {/if}
    {/each}
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
    <a href="{basePath}/about" onclick={closeDrawer} class="sf-drawer-link">About Us</a>
    <a href="{basePath}/policies/return" onclick={closeDrawer} class="sf-drawer-link">Return Policy</a>
    <a href="{basePath}/policies/shipping" onclick={closeDrawer} class="sf-drawer-link">Shipping Info</a>
    <a href="{basePath}/policies/terms" onclick={closeDrawer} class="sf-drawer-link">Terms &amp; Conditions</a>
    <a href="{basePath}/policies/faq" onclick={closeDrawer} class="sf-drawer-link">FAQ</a>
    <hr class="sf-drawer-sep" />
    <a href="{basePath}/track" onclick={closeDrawer} class="sf-drawer-link">Track Order</a>
    <a href="{basePath}/contact" onclick={closeDrawer} class="sf-drawer-link">Contact Us</a>
    <hr class="sf-drawer-sep" />
    <button class="sf-drawer-link sf-drawer-theme" onclick={toggleDark}>
      {#if isDark}{@render iconSun()} Light mode{:else}{@render iconMoon()} Dark mode{/if}
    </button>
  </div>
</nav>

<!-- Header: mobile (hamburger) or desktop (3-column grid) -->
<header class="sf-header" class:sf-header--immersive={immersive}>
  {#if isDesktop}
    <!-- Desktop: 3-col grid — logo+nav left / brand centre / search+actions right.
         When theme===minimal the dhCentered variant puts search in the left column. -->
    <div class="sf-container sf-header-inner sf-header-desktop"
      class:sf-header-centered={store.theme === 'minimal'}>
      {#if store.theme === 'minimal'}
        <!-- dhCentered: Home left (also keeps the brand centred) / brand centre / search + actions right -->
        <div class="sf-dh-col sf-dh-left">
          <nav class="sf-dh-nav" aria-label="Main navigation">
            {@render desktopPrimaryLinks()}
            <a href="{basePath}/about"
              class="sf-dh-navlink"
              class:sf-dh-navlink--active={localPathname === '/about'}
            >About Us</a>
          </nav>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-logo">
            {#if store.logoUrl}
              <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-logo-img" />
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
            {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            {@render iconBag()}
            {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
          </a>
        </div>
      {:else}
        <!-- Standard: logo+nav left / brand name centre / search+actions right -->
        <div class="sf-dh-col sf-dh-left">
          <a href="{basePath || '/'}" class="sf-logo sf-dh-logo">
            {#if store.logoUrl}
              <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-logo-img" />
            {:else}
              <span class="sf-logo-text">{store.name}</span>
            {/if}
          </a>
          <nav class="sf-dh-nav" aria-label="Main navigation">
            {@render desktopPrimaryLinks()}
            <a href="{basePath}/about"
              class="sf-dh-navlink"
              class:sf-dh-navlink--active={localPathname === '/about'}
            >About Us</a>
            <a href="{basePath}/products"
              class="sf-dh-navlink"
              class:sf-dh-navlink--active={localPathname === '/products' && !catParam}
            >All Products</a>
            {#each categoryTree as cat}
              <!-- Subcategories live in a dropdown under their parent; no subcategories, no dropdown -->
              <div class="sf-dh-navitem">
                <a href="{basePath}/products?category={cat.id}"
                  class="sf-dh-navlink"
                  class:sf-dh-navlink--active={localPathname === '/products' && (catParam === cat.id || cat.children.some((c) => c.id === catParam))}
                  aria-haspopup={cat.children.length > 0 ? 'true' : undefined}
                >{cat.name}{#if cat.children.length > 0}<span class="sf-dh-caret" aria-hidden="true">▾</span>{/if}</a>
                {#if cat.children.length > 0}
                  <div class="sf-dh-dropdown">
                    {#each cat.children as child}
                      <a href="{basePath}/products?category={child.id}"
                        class="sf-dh-dropdown-link"
                        class:sf-dh-dropdown-link--active={localPathname === '/products' && catParam === child.id}
                      >{child.name}</a>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </nav>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-dh-brand-link">
            {#if store.logoUrl}
              <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-logo-img" />
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
            {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            {@render iconBag()}
            {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
          </a>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Mobile: hamburger / centred logo / search + cart -->
    <div class="sf-container sf-header-inner sf-header-mobile">
      <button class="sf-hamburger" onclick={openDrawer} aria-label="Open menu" aria-expanded={drawerOpen}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="15" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <a href="{basePath || '/'}" class="sf-logo sf-logo-mobile">
        {#if store.logoUrl}
          <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-logo-img" />
        {:else}
          <span class="sf-logo-text">{store.name}</span>
        {/if}
      </a>
      <div class="sf-header-actions">
        <button class="sf-icon-btn" onclick={toggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
        </button>
        <button class="sf-icon-btn" onclick={toggleSearch} aria-label="Search" aria-expanded={searchOpen}>
          {@render iconSearch()}
        </button>
        <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
          {@render iconBag()}
          {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
        </a>
      </div>
    </div>
    {#if searchOpen}
      <form method="GET" action="{basePath}/products" class="sf-container sf-mobile-search">
        <input bind:this={searchInput} type="search" name="q" placeholder="Search products…"
          class="sf-mobile-search-input" aria-label="Search products" />
      </form>
    {/if}
  {/if}
</header>

<!-- Main content -->
<main class="sf-main" class:sf-main--reels={onReels} class:sf-main--immersive={immersive}>
  <div class="sf-container">
    {@render children()}
  </div>
</main>

<!-- Footer -->
<footer class="sf-footer" class:sf-footer--reels={onReels}>
  <div class="sf-container sf-footer-inner">
    <!-- Brand column: hidden on mobile, first of 4 cols on desktop -->
    <div class="sf-footer-col sf-footer-brand-col">
      <a href="{basePath || '/'}" class="sf-footer-brand-link">
        {#if store.logoUrl}
          <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-footer-brand-logo" />
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
      <a href="{basePath}/about" class="sf-footer-link">About Us</a>
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

<!-- Mobile bottom navigation bar (hidden on desktop) -->
{#if !isDesktop}
  <nav class="sf-bottom-nav" class:sf-bottom-nav--immersive={immersive} aria-label="Quick navigation">
    {#each primaryOrder as key}
      {#if key === 'home'}
        <a href="{basePath || '/'}" class="sf-bn-item" class:sf-bn-item--active={localPathname === '/' && !searchOpen}>
          {@render iconHome()}<span>Home</span>
        </a>
      {:else}
        <a href="{basePath}/reels" class="sf-bn-item" class:sf-bn-item--active={onReels && !searchOpen}>
          {@render iconReels()}<span>Reels</span>
        </a>
      {/if}
    {/each}
    <a href="{basePath}/products" class="sf-bn-item"
      class:sf-bn-item--active={localPathname.startsWith('/products') && !searchOpen}>
      {@render iconShop()}<span>Shop</span>
    </a>
    <a href="{basePath}/cart" class="sf-bn-item" class:sf-bn-item--active={localPathname === '/cart' && !searchOpen}
      aria-label="Cart ({itemCount} items)">
      <span class="sf-bn-icon">
        {@render iconBag()}
        {#if itemCount > 0}<span class="sf-cart-badge sf-bn-badge">{itemCount}</span>{/if}
      </span>
      <span>Cart</span>
    </a>
    <button class="sf-bn-item" class:sf-bn-item--active={searchOpen} onclick={openSearch}>
      {@render iconSearch()}<span>Search</span>
    </button>
  </nav>
{/if}

<!-- Theme switcher: fixed bottom-right on desktop only. -->
<button
  class="sf-theme-switcher"
  onclick={toggleDark}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
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
    background: var(--sf-announce-bg);
    color: var(--sf-announce-text);
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
  }
  .sf-announce--immersive { background: #000; color: #fff; }

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
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
  }
  .sf-install-banner--immersive {
    background: #000;
    border-bottom-color: #222;
    color: #fff;
  }
  .sf-install-banner--immersive .sf-install-dismiss { color: rgba(255, 255, 255, 0.7); }
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
  .sf-drawer-theme {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font: inherit;
    font-size: 0.9375rem;
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
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
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
    height: 64px;
  }

  /* Desktop header inner: 3-col grid */
  .sf-header-desktop {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 24px;
    height: 88px;
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
    flex-wrap: wrap; /* wrap rather than clip, so dropdowns are never cut off */
  }
  .sf-dh-navitem {
    position: relative;
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
  .sf-dh-caret {
    margin-left: 4px;
    font-size: 1.4rem; /* doubled for visibility */
    line-height: 0; /* keep the larger arrow from making the nav row taller */
    vertical-align: middle;
    opacity: 0.8;
  }

  /* Subcategory dropdown: opens on hover or keyboard focus */
  .sf-dh-dropdown {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 60;
    min-width: 180px;
    padding: 6px 0;
    background: var(--sf-surface, #fff);
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
  .sf-dh-navitem:hover > .sf-dh-dropdown,
  .sf-dh-navitem:focus-within > .sf-dh-dropdown {
    display: block;
  }
  .sf-dh-dropdown-link {
    display: block;
    padding: 8px 16px;
    font-size: 0.8125rem;
    color: var(--sf-text, #212529);
    text-decoration: none;
    white-space: nowrap;
  }
  .sf-dh-dropdown-link:hover,
  .sf-dh-dropdown-link:focus-visible {
    background: var(--sf-bg, #f8f9fa);
    color: var(--sf-primary, #0d6efd);
  }
  .sf-dh-dropdown-link--active {
    color: var(--sf-primary, #0d6efd);
    font-weight: 600;
  }

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
    transition: background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease;
  }
  .sf-dh-search:focus { border-color: var(--sf-primary, #0d6efd); }

  /* Desktop centre column brand link */
  .sf-dh-brand-link {
    text-decoration: none;
    display: flex;
    align-items: center;
  }

  /* ── Mobile header: hamburger left / logo centred / icons right ── */
  .sf-header-mobile {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
  }
  .sf-header-mobile .sf-hamburger { justify-self: start; }
  .sf-header-mobile .sf-header-actions { justify-self: end; }
  .sf-logo-mobile {
    flex: none;
    justify-content: center;
    max-width: 60vw;
  }
  .sf-logo-mobile .sf-logo-img { height: 40px; max-width: 100%; }

  .sf-mobile-search {
    display: block;
    padding-bottom: 12px;
  }
  .sf-mobile-search-input {
    width: 100%;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    padding: 10px 14px;
    font-size: 1rem; /* >=16px avoids iOS zoom-on-focus */
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    outline: none;
  }
  .sf-mobile-search-input:focus { border-color: var(--sf-primary, #0d6efd); }

  /* ── Reels (mobile): black header, white icons, no logo ── */
  .sf-header--immersive {
    background: #000;
    border-bottom-color: #000;
  }
  .sf-header--immersive .sf-hamburger,
  .sf-header--immersive .sf-icon-btn,
  .sf-header--immersive .sf-cart-btn { color: #fff; }
  .sf-logo-mobile { transition: opacity 0.35s ease, visibility 0.35s; }
  .sf-header--immersive .sf-logo-mobile { opacity: 0; visibility: hidden; } /* keeps the icons in place */
  .sf-dh-logo,
  .sf-dh-brand-link,
  .sf-dh-center .sf-logo { transition: opacity 0.35s ease, visibility 0.35s; }
  .sf-header--immersive .sf-dh-logo,
  .sf-header--immersive .sf-dh-brand-link,
  .sf-header--immersive .sf-dh-center .sf-logo { opacity: 0; visibility: hidden; }
  .sf-header--immersive .sf-dh-navlink { color: rgba(255, 255, 255, 0.8); }
  .sf-header--immersive .sf-dh-navlink:hover,
  .sf-header--immersive .sf-dh-navlink--active { color: #fff; border-bottom-color: #fff; }
  .sf-header--immersive .sf-dh-search {
    background: #1a1a1a;
    border-color: #333;
    color: #fff;
  }
  .sf-header--immersive .sf-mobile-search-input {
    background: #1a1a1a;
    border-color: #333;
    color: #fff;
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
    transition: color 0.35s ease;
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
    height: 44px;
    width: auto;
    max-width: 220px;
    object-fit: contain;
  }
  @media (min-width: 1024px) {
    .sf-logo-img {
      height: 64px;
      max-width: 280px;
    }
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
    transition: color 0.35s ease;
  }
  .sf-cart-btn {
    position: relative;
    text-decoration: none;
    color: var(--sf-text, #212529);
    font-size: 1.25rem;
    padding: 6px;
    display: flex;
    align-items: center;
    transition: color 0.35s ease;
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
    transition: background-color 0.35s ease, color 0.35s ease;
  }
  .sf-main--immersive { background: #000; color: #fff; }
  @media (min-width: 1024px) {
    .sf-main { padding-bottom: 0; }
  }
  /* Reels: the feed fills the screen (above the bottom nav on mobile), so no gap and no footer */
  @media (max-width: 1023px) {
    .sf-main--reels { padding-bottom: 0; }
  }
  .sf-footer--reels { display: none; }
  :global(html[data-reels]),
  :global(html[data-reels] body) { background: #000; }

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
    height: 64px;
    width: auto;
    max-width: 260px;
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

  /* ── Mobile bottom nav ── */
  .sf-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30; /* above content, below drawer overlay (40) and filter sheet (50) */
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr; /* 4 or 5 items depending on whether the store has reels */
    background: var(--sf-surface, #fff);
    border-top: 1px solid var(--sf-border, #dee2e6);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }
  .sf-bn-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 60px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--sf-text, #212529);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.35s ease;
  }
  .sf-bn-item::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: transparent;
    transition: background 0.15s;
  }
  .sf-bn-item--active { color: var(--sf-primary, #0d6efd); }
  .sf-bn-item--active::before { background: var(--sf-primary, #0d6efd); }
  .sf-bn-icon {
    position: relative;
    display: flex;
  }
  .sf-bn-badge {
    top: -6px;
    right: -9px;
  }
  /* Reels (mobile): black bar, white items */
  .sf-bottom-nav--immersive {
    background: #000;
    border-top-color: #000;
    box-shadow: none;
  }
  .sf-bottom-nav--immersive .sf-bn-item { color: rgba(255, 255, 255, 0.7); }
  .sf-bottom-nav--immersive .sf-bn-item--active { color: #fff; }
  .sf-bottom-nav--immersive .sf-bn-item--active::before { background: #fff; }

  @media (min-width: 1024px) {
    .sf-bottom-nav { display: none; }
  }

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
