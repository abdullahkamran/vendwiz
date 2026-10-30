<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { cart } from '$lib/stores/cart';
  import { darkMode } from '$lib/stores/darkMode';
  import { themeRootCSS, themeDarkCSS } from '$lib/theme/tokens';
  import { themeColorFor } from '$lib/seo';
  import { onMount } from 'svelte';
  import { fly, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { buildCategoryTree } from '$lib/utils/category-tree';
  import CartDrawer from '$lib/components/storefront/CartDrawer.svelte';
  import WhatsAppChat from '$lib/components/storefront/WhatsAppChat.svelte';
  import { whatsappDigits } from '$lib/utils/phone';

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
  // Owner's announcement-bar colours (Settings → Announcement); invalid values fall back to the theme.
  // Not applied on Reels, where the bar is black like the rest of the page.
  let announceStyle = $derived.by(() => {
    if (immersive) return undefined;
    const parts: string[] = [];
    if (store.announcementBg && isSafeCSSColor(store.announcementBg)) parts.push(`background:${store.announcementBg}`);
    if (store.announcementFg && isSafeCSSColor(store.announcementFg)) parts.push(`color:${store.announcementFg}`);
    return parts.join(';') || undefined;
  });
  let categories = $derived(data.categories ?? []);
  let basePath = $derived(data.basePath ?? '');

  // Build parent→children tree for hierarchical nav rendering
  let categoryTree = $derived(buildCategoryTree(categories));

  // Cart item count
  let itemCount = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));

  // Desktop nav: up to 3 top-level categories get their own menu item; more than that are
  // grouped under a single "Categories" item
  const MAX_INLINE_CATEGORIES = 3;
  let groupCategories = $derived(categoryTree.length > MAX_INLINE_CATEGORIES);

  // Footer "Our Stores" column: the owner's physical shops (hidden when there are none)
  let storeLocations = $derived(store.storeLocations ?? []);
  // Social settings may hold a full URL or just the handle
  function socialUrl(base: string, value: string): string {
    return /^https?:\/\//i.test(value) ? value : base + value.replace(/^@/, '');
  }

  // Drawer state
  let drawerOpen = $state(false);
  // Mobile drawer has two tabs: site menu and the category list
  let drawerTab = $state<'menu' | 'categories'>('menu');
  // Policy pages, listed under the drawer's expandable "Information" row
  const POLICY_LINKS = [
    { type: 'return', label: 'Return Policy' },
    { type: 'shipping', label: 'Shipping Info' },
    { type: 'terms', label: 'Terms & Conditions' },
    { type: 'faq', label: 'FAQ' },
    { type: 'privacy', label: 'Privacy Policy' }
  ] as const;
  let infoOpen = $state(false);
  // Menu animations (tab switch, expand / collapse); off for people who ask their device to reduce motion
  let menuAnimMs = $state(240);
  // Touch screens have no hover and don't reliably show :active, so the item under the finger is
  // marked while pressed (styled red like a hovered item)
  let pressedEl: HTMLElement | null = null;
  function pressDrawerItem(e: PointerEvent) {
    releaseDrawerItem();
    pressedEl = (e.target as HTMLElement).closest<HTMLElement>('.sf-drawer-link, .sf-drawer-chevron');
    pressedEl?.setAttribute('data-pressed', '');
  }
  function releaseDrawerItem() {
    pressedEl?.removeAttribute('data-pressed');
    pressedEl = null;
  }
  function openDrawer() {
    if (localPathname.startsWith('/policies/')) infoOpen = true;
    drawerOpen = true;
  }
  function closeDrawer() { drawerOpen = false; }

  // Drawer category expand/collapse state: { categoryId: boolean }
  let expanded = $state<Record<string, boolean>>({});
  function toggleExpanded(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    expanded[id] = !expanded[id];
  }

  // Desktop header search: collapsed to an icon until opened
  let dhSearchOpen = $state(false);
  let dhSearchQuery = $state('');
  let dhSearchInput = $state<HTMLInputElement | null>(null);
  function openDhSearch() {
    dhSearchOpen = true;
    setTimeout(() => dhSearchInput?.focus(), 0);
  }
  function closeDhSearch() {
    dhSearchOpen = false;
    dhSearchQuery = '';
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
  // Shop (all products) always follows Home.
  let primaryOrder = $derived<readonly ('home' | 'shop' | 'reels')[]>(
    !hasReels ? ['home', 'shop'] : isApp ? ['reels', 'home', 'shop'] : ['home', 'shop', 'reels']
  );
  let onShop = $derived(localPathname === '/products' && !catParam);
  let onReels = $derived(localPathname === '/reels');
  // Reels is immersive (mobile and desktop): black header, banners, bottom nav and page; logo hidden
  let immersive = $derived(onReels);

  // Desktop home page: the header sits transparent over the slideshow until the page is scrolled
  // (or the header is hovered / focused — see CSS), then turns solid.
  let scrolled = $state(false);
  let overlayHeader = $derived(isDesktop && localPathname === '/' && !scrolled);

  // Close the mobile search panel whenever the route changes
  $effect(() => {
    void $page.url.href;
    searchOpen = false;
    dhSearchOpen = false;
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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) menuAnimMs = 0;

    function onResize() { isDesktop = window.innerWidth >= 1024; }
    window.addEventListener('resize', onResize);
    function onScroll() { scrolled = window.scrollY > 40; }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

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
      window.removeEventListener('scroll', onScroll);
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
{#snippet iconCart()}
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.2l1.6-6.8H6.1"/>
    <circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/>
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
<!-- Desktop search: just an icon until clicked, then the bar slides open beside it -->
{#snippet desktopSearch()}
  <form method="GET" action="{basePath}/products" class="sf-dh-search-wrap" class:sf-dh-search-wrap--open={dhSearchOpen}
    onsubmit={(e) => { if (!dhSearchQuery.trim()) { e.preventDefault(); closeDhSearch(); } }}>
    <input bind:this={dhSearchInput} bind:value={dhSearchQuery} type="search" name="q" placeholder="Search products…"
      class="sf-dh-search" aria-label="Search products" tabindex={dhSearchOpen ? 0 : -1}
      onkeydown={(e) => e.key === 'Escape' && closeDhSearch()}
      onblur={() => { if (!dhSearchQuery.trim()) closeDhSearch(); }} />
    <button type={dhSearchOpen ? 'submit' : 'button'} class="sf-icon-btn"
      onclick={(e) => { if (!dhSearchOpen) { e.preventDefault(); openDhSearch(); } }}
      onmousedown={(e) => dhSearchOpen && e.preventDefault()}
      aria-label={dhSearchOpen ? 'Search' : 'Open search'} aria-expanded={dhSearchOpen}>
      {@render iconSearch()}
    </button>
  </form>
{/snippet}
<!-- Header brand: logo (or store name) with the store's tagline beneath -->
{#snippet brandMark()}
  {#if store.logoUrl}
    <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-logo-img" />
  {:else}
    <span class="sf-logo-text">{store.name}</span>
  {/if}
  {#if store.description}<span class="sf-tagline">{store.description}</span>{/if}
{/snippet}
<!-- Home + Shop + Reels for the desktop header, ordered by app/web (see primaryOrder) -->
{#snippet desktopPrimaryLinks()}
  {#each primaryOrder as key}
    {#if key === 'home'}
      <a href="{basePath || '/'}" class="sf-dh-navlink" class:sf-dh-navlink--active={localPathname === '/'}>Home</a>
    {:else if key === 'shop'}
      <a href="{basePath}/products" class="sf-dh-navlink" class:sf-dh-navlink--active={onShop}>Shop</a>
    {:else}
      <a href="{basePath}/reels" class="sf-dh-navlink" class:sf-dh-navlink--active={onReels}>Reels</a>
    {/if}
  {/each}
{/snippet}
<!-- Desktop category menu: each category with a subcategory dropdown, or — with more than
     MAX_INLINE_CATEGORIES — one "Categories" item whose dropdown has flyouts for subcategories -->
{#snippet desktopCategoryNav()}
  {#if groupCategories}
    <div class="sf-dh-navitem">
      <button type="button" class="sf-dh-navlink sf-dh-navbtn"
        class:sf-dh-navlink--active={localPathname === '/products' && !!catParam}
        aria-haspopup="true"
      >Categories<svg class="sf-dh-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>
      <div class="sf-dh-dropdown">
        {#each categoryTree as cat}
          <div class="sf-dh-subitem">
            <a href="{basePath}/products?category={cat.id}"
              class="sf-dh-dropdown-link"
              class:sf-dh-dropdown-link--active={localPathname === '/products' && catParam === cat.id}
              aria-haspopup={cat.children.length > 0 ? 'true' : undefined}
            >{cat.name}{#if cat.children.length > 0}<svg class="sf-dh-flyout-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>{/if}</a>
            {#if cat.children.length > 0}
              <div class="sf-dh-dropdown sf-dh-flyout">
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
      </div>
    </div>
  {:else}
    {#each categoryTree as cat}
      <!-- Subcategories live in a dropdown under their parent; no subcategories, no dropdown -->
      <div class="sf-dh-navitem">
        <a href="{basePath}/products?category={cat.id}"
          class="sf-dh-navlink"
          class:sf-dh-navlink--active={localPathname === '/products' && (catParam === cat.id || cat.children.some((c) => c.id === catParam))}
          aria-haspopup={cat.children.length > 0 ? 'true' : undefined}
        >{cat.name}{#if cat.children.length > 0}<svg class="sf-dh-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>{/if}</a>
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
  {/if}
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
  <div class="sf-announce" class:sf-announce--immersive={immersive} style={announceStyle}>
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
<nav class="sf-drawer" class:sf-drawer--open={drawerOpen} class:sf-drawer--playful={store.theme === 'playful'} class:sf-drawer--bold={store.theme === 'bold'} aria-label="Navigation drawer"
  onpointerdown={pressDrawerItem} onpointerup={releaseDrawerItem} onpointercancel={releaseDrawerItem} onpointerleave={releaseDrawerItem}>
  <div class="sf-drawer-header">
    <span class="sf-drawer-brand">{store.name}</span>
    <button class="sf-drawer-close" onclick={closeDrawer} aria-label="Close menu">✕</button>
  </div>
  <form method="GET" action="{basePath}/products" class="sf-drawer-search" onsubmit={closeDrawer}>
    <input type="search" name="q" placeholder="Search for products" aria-label="Search products" />
    <button type="submit" aria-label="Search">{@render iconSearch()}</button>
  </form>

  {#if categoryTree.length > 0}
    <div class="sf-drawer-tabs" role="tablist" style="--tab:{drawerTab === 'menu' ? 0 : 1}">
      <span class="sf-drawer-tab-ind" aria-hidden="true"></span>
      <button role="tab" class="sf-drawer-tab" class:sf-drawer-tab--active={drawerTab === 'menu'}
        aria-selected={drawerTab === 'menu'} onclick={() => (drawerTab = 'menu')}>Menu</button>
      <button role="tab" class="sf-drawer-tab" class:sf-drawer-tab--active={drawerTab === 'categories'}
        aria-selected={drawerTab === 'categories'} onclick={() => (drawerTab = 'categories')}>Categories</button>
    </div>
  {/if}

  <div class="sf-drawer-body">
    <!-- Re-created on tab switch so the list slides in from the side of the chosen tab -->
    {#key drawerTab}
    <div class="sf-drawer-pane" in:fly={{ x: drawerTab === 'menu' ? -28 : 28, duration: menuAnimMs, easing: cubicOut }}>
    {#if drawerTab === 'categories' && categoryTree.length > 0}
      {#each categoryTree as cat}
        {@const catActive = localPathname === '/products' && catParam === cat.id}
        <div class="sf-drawer-cat-row">
          <a href="{basePath}/products?category={cat.id}" onclick={closeDrawer}
            class="sf-drawer-link sf-drawer-cat-link" class:sf-drawer-link--active={catActive}>
            {#if cat.imageUrl}<img src={mediaUrl(cat.imageUrl)} alt="" class="sf-drawer-cat-img" />{/if}
            <span>{cat.name}</span>
          </a>
          {#if cat.children.length > 0}
            <button
              class="sf-drawer-chevron"
              onclick={(e) => toggleExpanded(cat.id, e)}
              aria-label="{expanded[cat.id] ? 'Collapse' : 'Expand'} {cat.name} subcategories"
              aria-expanded={expanded[cat.id] ?? false}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                style="transition:transform 0.2s; transform:rotate({expanded[cat.id] ? '90deg' : '0deg'});">
                <polyline points="5,2 10,7 5,12"/>
              </svg>
            </button>
          {/if}
        </div>
        {#if expanded[cat.id]}
          <div class="sf-drawer-sub" transition:slide={{ duration: menuAnimMs, easing: cubicOut }}>
            {#each cat.children as child}
              <a href="{basePath}/products?category={child.id}" onclick={closeDrawer}
                class="sf-drawer-link sf-drawer-sublink"
                class:sf-drawer-link--active={localPathname === '/products' && catParam === child.id}>{child.name}</a>
            {/each}
          </div>
        {/if}
      {/each}
    {:else}
      {#each primaryOrder as key}
        {#if key === 'home'}
          <a href="{basePath || '/'}" onclick={closeDrawer} class="sf-drawer-link" class:sf-drawer-link--active={localPathname === '/'}>Home</a>
        {:else if key === 'shop'}
          <a href="{basePath}/products" onclick={closeDrawer} class="sf-drawer-link" class:sf-drawer-link--active={onShop}>Shop</a>
        {:else}
          <a href="{basePath}/reels" onclick={closeDrawer} class="sf-drawer-link" class:sf-drawer-link--active={onReels}>Reels</a>
        {/if}
      {/each}
      <a href="{basePath}/about" onclick={closeDrawer} class="sf-drawer-link" class:sf-drawer-link--active={localPathname === '/about'}>About Us</a>
      <a href="{basePath}/track" onclick={closeDrawer} class="sf-drawer-link">Track Order</a>
      <a href="{basePath}/contact" onclick={closeDrawer} class="sf-drawer-link">Contact Us</a>
      <button class="sf-drawer-link sf-drawer-acc" onclick={() => (infoOpen = !infoOpen)} aria-expanded={infoOpen}>
        <span>Information</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          style="transition:transform 0.2s; transform:rotate({infoOpen ? '90deg' : '0deg'});">
          <polyline points="5,2 10,7 5,12"/>
        </svg>
      </button>
      {#if infoOpen}
        <div class="sf-drawer-sub" transition:slide={{ duration: menuAnimMs, easing: cubicOut }}>
          {#each POLICY_LINKS as pl}
            <a href="{basePath}/policies/{pl.type}" onclick={closeDrawer} class="sf-drawer-link sf-drawer-sublink"
              class:sf-drawer-link--active={localPathname === `/policies/${pl.type}`}>{pl.label}</a>
          {/each}
        </div>
      {/if}
      <button class="sf-drawer-link sf-drawer-theme" onclick={toggleDark}>
        {#if isDark}{@render iconSun()} Light mode{:else}{@render iconMoon()} Dark mode{/if}
      </button>
    {/if}
    </div>
    {/key}
  </div>
</nav>

<!-- Header: mobile (hamburger) or desktop (3-column grid) -->
<header class="sf-header" class:sf-header--immersive={immersive} class:sf-header--overlay={overlayHeader} class:sf-header--bold={store.theme === 'bold'}>
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
            {@render desktopCategoryNav()}
          </nav>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-logo sf-brand">{@render brandMark()}</a>
        </div>
        <div class="sf-dh-col sf-dh-right">
          {@render desktopSearch()}
          <button class="sf-icon-btn" onclick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            {@render iconCart()}
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
            {@render desktopCategoryNav()}
          </nav>
        </div>
        <div class="sf-dh-col sf-dh-center">
          <a href="{basePath || '/'}" class="sf-dh-brand-link sf-brand">{@render brandMark()}</a>
        </div>
        <div class="sf-dh-col sf-dh-right">
          {@render desktopSearch()}
          <button class="sf-icon-btn" onclick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
          </button>
          <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
            {@render iconCart()}
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
      <a href="{basePath || '/'}" class="sf-logo sf-logo-mobile sf-brand">{@render brandMark()}</a>
      <div class="sf-header-actions">
        <button class="sf-icon-btn" onclick={toggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if isDark}{@render iconSun()}{:else}{@render iconMoon()}{/if}
        </button>
        <button class="sf-icon-btn" onclick={toggleSearch} aria-label="Search" aria-expanded={searchOpen}>
          {@render iconSearch()}
        </button>
        <a href="{basePath}/cart" class="sf-cart-btn" aria-label="Cart ({itemCount} items)">
          {@render iconCart()}
          {#if itemCount > 0}<span class="sf-cart-badge">{itemCount}</span>{/if}
        </a>
      </div>
    </div>
    {#if searchOpen}
      <form method="GET" action="{basePath}/products" class="sf-container sf-mobile-search">
        <span class="sf-search-pill">
          <span class="sf-search-pill-icon">{@render iconSearch()}</span>
          <input bind:this={searchInput} type="search" name="q" placeholder="Search products…"
            class="sf-mobile-search-input" aria-label="Search products" />
        </span>
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

<!-- Footer "Follow Us": heading and social icons, under the Customer Care links -->
{#snippet followUs()}
  <div class="sf-follow">
      <p class="sf-footer-heading sf-footer-follow">Follow Us</p>
      <div class="sf-footer-social">
        {#if store.whatsapp}
          <a href="https://wa.me/{whatsappDigits(store.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.549 4.116 1.516 5.843L.057 23.428a.5.5 0 00.614.614l5.601-1.463A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.999-1.371l-.358-.213-3.716.971.991-3.625-.234-.372A9.796 9.796 0 012.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/></svg>
          </a>
        {/if}
        {#if store.instagram}
          <a href={socialUrl('https://instagram.com/', store.instagram)} target="_blank" rel="noopener" aria-label="Instagram" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.920-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
        {/if}
        {#if store.facebook}
          <a href={socialUrl('https://facebook.com/', store.facebook)} target="_blank" rel="noopener" aria-label="Facebook" class="sf-social-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.830c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        {/if}
      </div>
  </div>
{/snippet}

<!-- Footer -->
<footer class="sf-footer" class:sf-footer--reels={onReels}>
  <div class="sf-container sf-footer-inner" style="--sf-footer-cols:{storeLocations.length > 0 ? 3 : 2}">
    <!-- Brand: logo -->
    <div class="sf-footer-brand-col">
      <a href="{basePath || '/'}" class="sf-footer-brand-link">
        {#if store.logoUrl}
          <img src={mediaUrl(store.logoUrl)} alt={store.name} class="sf-footer-brand-logo" />
        {:else}
          <span class="sf-footer-brand-name">{store.name}</span>
        {/if}
      </a>
    </div>

    {#if storeLocations.length > 0}
      <nav class="sf-footer-col sf-footer-col--stores" aria-label="Our stores">
        <p class="sf-footer-heading">Our Stores</p>
        {#each storeLocations as loc}
          <!-- Linked to the map when the owner gave one; otherwise just listed -->
          <svelte:element this={loc.mapUrl ? 'a' : 'span'}
            href={loc.mapUrl || undefined}
            target={loc.mapUrl ? '_blank' : undefined}
            rel={loc.mapUrl ? 'noopener' : undefined}
            class="sf-footer-link sf-footer-store"
            class:sf-footer-store--plain={!loc.mapUrl}>
            {loc.name}
          </svelte:element>
        {/each}
      </nav>
    {/if}

    <nav class="sf-footer-col sf-footer-col--info" aria-label="Information">
      <p class="sf-footer-heading">Information</p>
      <a href="{basePath}/about" class="sf-footer-link">About Us</a>
      <a href="{basePath}/policies/return" class="sf-footer-link">Return Policy</a>
      <a href="{basePath}/policies/shipping" class="sf-footer-link">Shipping Info</a>
      <a href="{basePath}/policies/terms" class="sf-footer-link">Terms &amp; Conditions</a>
      <a href="{basePath}/policies/faq" class="sf-footer-link">FAQ</a>
      <a href="{basePath}/policies/privacy" class="sf-footer-link">Privacy Policy</a>
    </nav>

    <nav class="sf-footer-col sf-footer-col--care" aria-label="Customer care">
      <p class="sf-footer-heading">Customer Care</p>
      <a href="{basePath}/track" class="sf-footer-link">Track Your Order</a>
      <a href="{basePath}/contact" class="sf-footer-link">Contact Us</a>
      {#if store.androidAppEnabled && store.androidPlayUrl}
        <a href={store.androidPlayUrl} target="_blank" rel="noopener" class="sf-footer-link">Get our Android app</a>
      {/if}
      {#if store.whatsapp || store.instagram || store.facebook}{@render followUs()}{/if}
    </nav>
  </div>

  <div class="sf-container sf-footer-bottom">
    <p class="sf-footer-copy">© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
    <p class="sf-footer-credit">Powered by <a href="https://vendwiz.com" class="sf-footer-credit-link">VendWiz</a></p>
  </div>
</footer>

<!-- Mobile bottom navigation bar (hidden on desktop) -->
{#if !isDesktop}
  <nav class="sf-bottom-nav" class:sf-bottom-nav--immersive={immersive} aria-label="Quick navigation">
    {#each primaryOrder as key}
      {#if key === 'home'}
        <a href="{basePath || '/'}" class="sf-bn-item" class:sf-bn-item--active={localPathname === '/' && !searchOpen}>
          {@render iconHome()}<span>Home</span>
        </a>
      {:else if key === 'shop'}
        <a href="{basePath}/products" class="sf-bn-item"
          class:sf-bn-item--active={localPathname.startsWith('/products') && !searchOpen}>
          {@render iconShop()}<span>Shop</span>
        </a>
      {:else}
        <a href="{basePath}/reels" class="sf-bn-item" class:sf-bn-item--active={onReels && !searchOpen}>
          {@render iconReels()}<span>Reels</span>
        </a>
      {/if}
    {/each}
    <a href="{basePath}/cart" class="sf-bn-item" class:sf-bn-item--active={localPathname === '/cart' && !searchOpen}
      aria-label="Cart ({itemCount} items)">
      <span class="sf-bn-icon">
        {@render iconCart()}
        {#if itemCount > 0}<span class="sf-cart-badge sf-bn-badge">{itemCount}</span>{/if}
      </span>
      <span>Cart</span>
    </a>
    <button class="sf-bn-item" class:sf-bn-item--active={searchOpen} onclick={openSearch}>
      {@render iconSearch()}<span>Search</span>
    </button>
  </nav>
{/if}

<!-- Slide-in cart (opens after an item is added) -->
<CartDrawer {basePath} currencySymbol={store.currencySymbol ?? ''} />

<!-- WhatsApp chat button: fixed bottom-right (above the bottom nav on mobile); not on Reels -->
{#if store.whatsapp && !onReels}
  <WhatsAppChat phone={store.whatsapp} raised={!isDesktop} />
{/if}

<style>
  /* ── Global reset for storefront ── */
  :global(*, *::before, *::after) { box-sizing: border-box; }
  /* Page background follows the theme (dark in dark mode), so no white shows in gaps or overscroll */
  :global(html), :global(body) { background: var(--sf-bg, #fff); }

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
    width: min(320px, 88vw);
    background: var(--sf-bg, #fff);
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
  /* Search box at the top of the drawer */
  .sf-drawer-search {
    position: relative;
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    flex-shrink: 0;
  }
  .sf-drawer-search input {
    flex: 1;
    min-width: 0;
    height: 44px;
    box-sizing: border-box;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    outline: none;
    background: color-mix(in srgb, var(--sf-text, #212529) 5%, var(--sf-bg, #fff));
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 1rem; /* >=16px avoids iOS zoom-on-focus */
    padding: 0 48px 0 18px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .sf-drawer-search input::placeholder { color: var(--sf-muted, #6c757d); }
  .sf-drawer-search input:focus {
    background: var(--sf-bg, #fff);
    border-color: var(--sf-text, #212529);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-text, #212529) 8%, transparent);
  }
  .sf-drawer-search button {
    position: absolute;
    right: 22px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--sf-text, #212529);
    border: none;
    cursor: pointer;
    color: var(--sf-bg, #fff);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sf-drawer-search button :global(svg) { width: 17px; height: 17px; }

  /* Menu | Categories tabs */
  .sf-drawer-tabs {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex-shrink: 0;
  }
  /* Highlight that slides to the chosen tab (--tab: 0 = Menu, 1 = Categories). Standard themes:
     the underline; Playful: a pill; Bold: a block (see their sections). */
  .sf-drawer-tab-ind {
    position: absolute;
    z-index: 2;
    left: 0;
    bottom: 0;
    width: 50%;
    height: 3px;
    background: #e53935; /* red in light mode, white in dark */
    transform: translateX(calc(var(--tab, 0) * 100%));
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }
  :global(html[data-dark]) .sf-drawer-tab-ind { background: #fff; }
  /* Playful pill and Bold block keep their theme colour in dark mode */
  :global(html[data-dark]) :is(.sf-drawer--playful, .sf-drawer--bold) .sf-drawer-tab-ind { background: var(--sf-primary); }
  .sf-drawer-pane,
  .sf-drawer-sub { display: flex; flex-direction: column; gap: inherit; }
  @media (prefers-reduced-motion: reduce) {
    .sf-drawer-tab-ind { transition: none; }
  }
  .sf-drawer-tab {
    padding: 16px 8px;
    border: none;
    border-bottom: 3px solid var(--sf-border, #dee2e6);
    background: color-mix(in srgb, var(--sf-text, #212529) 6%, var(--sf-bg, #fff));
    color: var(--sf-muted, #6c757d);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    position: relative;
    z-index: 1;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  .sf-drawer-tab--active {
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
  }

  .sf-drawer-body {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .sf-drawer-link {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 12px 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--sf-text, #212529);
    text-decoration: none;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    transition: background 0.15s, color 0.15s;
  }
  .sf-drawer-link.sf-drawer-link--active { color: #e53935; } /* also beats the grey sub-link colour */
  /* "Information" row: same look as the other items, with a chevron that opens the policy links */
  .sf-drawer-acc {
    justify-content: space-between;
    width: 100%;
    background: none;
    border-top: none;
    border-inline: none;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  /* Category row: link + optional chevron toggle, split by a divider */
  .sf-drawer-cat-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .sf-drawer-cat-link {
    flex: 1;
    min-width: 0;
    border-bottom: none;
  }
  .sf-drawer-cat-img {
    width: 24px;
    height: 24px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .sf-drawer-chevron {
    background: none;
    border: none;
    border-left: 1px solid var(--sf-border, #dee2e6);
    cursor: pointer;
    width: 60px;
    color: var(--sf-text, #212529);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Child categories: indented under their parent */
  .sf-drawer-sublink {
    min-height: 48px;
    padding-left: 36px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: var(--sf-muted, #6c757d);
    background: var(--sf-surface, #f8f9fa);
  }
  .sf-drawer-theme {
    width: 100%;
    background: none;
    border: none;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    cursor: pointer;
    text-align: left;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* ── Playful theme: softer mobile menu — rounded panel, gradient header, pill tabs and rounded
     "bubble" rows in normal case (other themes keep the lined, all-caps list). Hover / current-page
     text colours come from the shared menu rules; here they just get a matching tinted bubble. ── */
  .sf-drawer--playful {
    border-radius: 0 24px 24px 0;
    box-shadow: 8px 0 32px rgba(124, 58, 237, 0.18);
  }
  .sf-drawer--playful .sf-drawer-header {
    background: linear-gradient(135deg, var(--sf-primary, #7c3aed), color-mix(in srgb, var(--sf-primary, #7c3aed) 50%, #ec4899));
    border-bottom: none;
    padding: 18px 16px 18px 20px;
  }
  .sf-drawer--playful .sf-drawer-brand { color: #fff; font-size: 1.125rem; }
  .sf-drawer--playful .sf-drawer-close {
    color: #fff;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sf-drawer--playful .sf-drawer-search { border-bottom: none; padding: 14px 16px; } /* even, so the icon centres in the field */
  .sf-drawer--playful .sf-drawer-tabs {
    margin: 8px 16px 6px;
    padding: 4px;
    gap: 4px;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--sf-primary, #7c3aed) 10%, transparent);
  }
  .sf-drawer--playful .sf-drawer-tab {
    padding: 10px 8px;
    border: none;
    border-radius: 9999px;
    background: transparent;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--sf-muted, #7c6d8a);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .sf-drawer--playful .sf-drawer-tab--active { background: transparent; color: var(--sf-on-primary, #fff); }
  .sf-drawer--playful .sf-drawer-tab-ind {
    z-index: 0;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc(50% - 6px);
    height: auto;
    border-radius: 9999px;
    background: var(--sf-primary, #7c3aed);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    transform: translateX(calc(var(--tab, 0) * (100% + 4px)));
  }
  .sf-drawer--playful .sf-drawer-body { padding: 8px 10px 16px; gap: 2px; }
  .sf-drawer--playful .sf-drawer-link {
    min-height: 48px;
    padding: 10px 16px;
    border-bottom: none;
    border-radius: 16px;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9875rem;
    font-weight: 700;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  /* Tinted bubble behind hovered, pressed and current-page items, in their own text colour */
  .sf-drawer--playful .sf-drawer-link:is(:hover, :focus-visible, :global([data-pressed])),
  .sf-drawer--playful .sf-drawer-link.sf-drawer-link--active,
  .sf-drawer--playful .sf-drawer-cat-row:has(.sf-drawer-link--active) {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .sf-drawer--playful .sf-drawer-cat-row { border-bottom: none; border-radius: 16px; }
  .sf-drawer--playful .sf-drawer-cat-row .sf-drawer-link:hover { background: transparent; }
  .sf-drawer--playful .sf-drawer-cat-row:hover { background: color-mix(in srgb, var(--sf-primary, #7c3aed) 8%, transparent); }
  .sf-drawer--playful .sf-drawer-cat-img { border-radius: 8px; width: 28px; height: 28px; }
  .sf-drawer--playful .sf-drawer-chevron {
    border-left: none;
    width: 36px;
    height: 36px;
    margin: auto 8px auto 0;
    border-radius: 50%;
    background: color-mix(in srgb, var(--sf-primary, #7c3aed) 10%, transparent);
  }
  .sf-drawer--playful .sf-drawer-sublink {
    min-height: 42px;
    margin-left: 18px;
    padding-left: 18px;
    background: transparent;
    font-weight: 600;
    font-size: 0.9375rem;
  }
  .sf-drawer--playful .sf-drawer-theme { border-bottom: none; margin-top: 6px; }

  /* ── Bold theme: blocky mobile menu — solid orange header, square corners, framed block tabs,
     big condensed capitals, and a thick orange bar beside hovered / current items. Text colours come
     from the shared menu rules. ── */
  .sf-drawer--bold { border-right: 3px solid var(--sf-primary, #f97316); }
  .sf-drawer--bold .sf-drawer-header {
    background: var(--sf-primary, #f97316);
    border-bottom: none;
    padding: 16px 14px 16px 20px;
  }
  .sf-drawer--bold .sf-drawer-brand {
    color: var(--sf-on-primary, #fff);
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 900);
    font-size: 1.375rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sf-drawer--bold .sf-drawer-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sf-on-primary, #fff);
    color: var(--sf-primary, #f97316);
    font-weight: 900;
  }
  .sf-drawer--bold .sf-drawer-search input { border-radius: 0; border-width: 2px; }
  .sf-drawer--bold .sf-drawer-search button { border-radius: 0; background: var(--sf-primary, #f97316); color: var(--sf-on-primary, #fff); }
  .sf-drawer--bold .sf-drawer-tabs {
    margin: 14px 16px 6px;
    border: 3px solid var(--sf-primary, #f97316);
  }
  .sf-drawer--bold .sf-drawer-tab {
    padding: 11px 8px;
    border: none;
    background: transparent;
    font-family: var(--sf-heading-font, system-ui);
    font-weight: 700;
    font-size: 1.0625rem;
    letter-spacing: 0.08em;
    color: var(--sf-muted, #94a3b8);
  }
  .sf-drawer--bold .sf-drawer-tab--active { background: transparent; color: var(--sf-on-primary, #fff); }
  .sf-drawer--bold .sf-drawer-tab-ind {
    z-index: 0;
    top: 0;
    bottom: 0;
    height: auto;
    background: var(--sf-primary, #f97316);
  }
  .sf-drawer--bold .sf-drawer-body { padding: 6px 0 16px; }
  .sf-drawer--bold .sf-drawer-link {
    position: relative;
    min-height: 54px;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 0.9375rem;
    letter-spacing: 0.08em;
    border-bottom: 1px solid var(--sf-border, #334155);
    transition: color 0.15s ease, padding-left 0.2s ease;
  }
  /* Thick orange bar on the left, item slides over */
  .sf-drawer--bold .sf-drawer-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: var(--sf-primary, #f97316);
    transition: width 0.2s ease;
  }
  .sf-drawer--bold .sf-drawer-link:is(:hover, :focus-visible, :global([data-pressed])),
  .sf-drawer--bold .sf-drawer-link.sf-drawer-link--active { padding-left: 28px; }
  .sf-drawer--bold .sf-drawer-link:is(:hover, :focus-visible, :global([data-pressed]))::before,
  .sf-drawer--bold .sf-drawer-link.sf-drawer-link--active::before { width: 6px; }
  .sf-drawer--bold .sf-drawer-cat-row { border-bottom: 1px solid var(--sf-border, #334155); }
  .sf-drawer--bold .sf-drawer-cat-link { border-bottom: none; }
  .sf-drawer--bold .sf-drawer-cat-img { border-radius: 0; }
  .sf-drawer--bold .sf-drawer-chevron { border-left: 1px solid var(--sf-border, #334155); }
  .sf-drawer--bold .sf-drawer-sublink {
    min-height: 46px;
    padding-left: 36px;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.9375rem;
    letter-spacing: 0;
    text-transform: none;
  }
  .sf-drawer--bold .sf-drawer-sublink:is(:hover, :focus-visible, :global([data-pressed])),
  .sf-drawer--bold .sf-drawer-sublink.sf-drawer-link--active { padding-left: 44px; }
  .sf-drawer--bold .sf-drawer-acc { font-size: 0.9375rem; font-weight: 500; }

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
    height: 72px; /* fits the logo + tagline */
  }

  /* Desktop header inner: 3-col grid */
  .sf-header-desktop {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 24px;
    height: 104px; /* fits the logo + tagline */
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
  .sf-dh-navlink--active {
    color: var(--sf-primary, #0d6efd);
    border-bottom-color: #e53935; /* selected item underline: red in light mode, white in dark */
  }
  :global(html[data-dark]) .sf-dh-navlink--active { border-bottom-color: #fff; }
  .sf-dh-navlink { display: inline-flex; align-items: center; }
  .sf-dh-caret {
    margin-left: 4px;
    width: 1em; /* scales with the menu text */
    height: 1em;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .sf-dh-navitem:hover > .sf-dh-navlink .sf-dh-caret,
  .sf-dh-navitem:focus-within > .sf-dh-navlink .sf-dh-caret { transform: rotate(180deg); }

  /* Subcategory dropdown: opens on hover or keyboard focus */
  /* Hidden but still laid out, so it can fade + slide in on hover / keyboard focus */
  .sf-dh-dropdown {
    display: block;
    visibility: hidden;
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
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
    visibility: visible;
    opacity: 1;
    transform: none;
    pointer-events: auto;
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
  .sf-dh-dropdown-link:focus-visible { background: var(--sf-bg, #f8f9fa); }

  /* ── Menu hover (desktop nav, dropdowns, mobile drawer): red text in light mode, white in dark
     mode. In dark mode items rest slightly dimmed so the white highlight stands out; the current
     page's item keeps its active colour. ── */
  :is(.sf-dh-navlink, .sf-dh-dropdown-link, .sf-drawer-link, .sf-drawer-chevron):is(:hover, :focus-visible) {
    color: #e53935;
  }
  :global(html[data-dark]) :is(.sf-dh-navlink:not(.sf-dh-navlink--active), .sf-dh-dropdown-link:not(.sf-dh-dropdown-link--active), .sf-drawer-link:not(.sf-drawer-link--active), .sf-drawer-chevron) {
    color: var(--sf-muted, #9ca3af);
  }
  :global(html[data-dark]) :is(.sf-dh-navlink, .sf-dh-dropdown-link):is(:hover, :focus-visible) {
    color: #fff;
  }
  /* Mobile menu: hovered, pressed (touch has no hover) and current-page items are red in light
     mode and white in dark mode */
  :is(.sf-drawer-link, .sf-drawer-chevron):is(:active, :global([data-pressed])) {
    color: #e53935;
  }
  :global(html[data-dark]) :is(.sf-drawer-link, .sf-drawer-chevron):is(:hover, :focus-visible, :active, :global([data-pressed])),
  :global(html[data-dark]) .sf-drawer-link.sf-drawer-link--active {
    color: #fff;
  }
  .sf-dh-dropdown-link--active {
    color: var(--sf-primary, #0d6efd);
    font-weight: 600;
  }
  /* "Categories" menu item is a button (it has no page of its own) */
  .sf-dh-navbtn {
    background: none;
    border-top: none;
    border-inline: none;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  /* Category rows in the grouped dropdown, with subcategories in a flyout to the right */
  .sf-dh-subitem { position: relative; }
  .sf-dh-subitem > .sf-dh-dropdown-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .sf-dh-flyout-caret { width: 1em; height: 1em; flex-shrink: 0; opacity: 0.7; }
  .sf-dh-flyout {
    top: -7px; /* line the first child up with its parent row */
    left: 100%;
    transform: translateX(-8px);
  }
  .sf-dh-subitem:hover > .sf-dh-flyout,
  .sf-dh-subitem:focus-within > .sf-dh-flyout {
    visibility: visible;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .sf-dh-dropdown { transition: none; transform: none; }
  }

  /* ── Desktop home: transparent header over the slideshow ──
     Items take the slideshow's text colour (readable on its background / dark image overlay in
     both light and dark mode). Hovering or focusing anything in the header brings back the solid
     theme background and normal item colours. */
  .sf-header--overlay {
    background: transparent;
    border-bottom-color: transparent;
  }
  .sf-header--overlay:hover,
  .sf-header--overlay:focus-within {
    background: var(--sf-surface, #fff);
    border-bottom-color: var(--sf-border, #dee2e6);
  }
  .sf-header--overlay:not(:hover):not(:focus-within) :is(.sf-dh-navlink, .sf-icon-btn, .sf-cart-btn, .sf-logo-text, .sf-tagline) {
    color: var(--sf-hero-fg, #fff);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  }
  .sf-header--overlay:not(:hover):not(:focus-within) :is(.sf-icon-btn, .sf-cart-btn) svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
  }
  .sf-header--overlay:not(:hover):not(:focus-within) .sf-dh-navlink--active {
    border-bottom-color: var(--sf-hero-fg, #fff);
  }
  .sf-header--overlay:not(:hover):not(:focus-within) .sf-dh-search-wrap--open {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.55);
  }
  .sf-header--overlay:not(:hover):not(:focus-within) .sf-dh-search { color: var(--sf-hero-fg, #fff); }
  .sf-header--overlay:not(:hover):not(:focus-within) .sf-dh-search::placeholder {
    color: var(--sf-hero-fg, #fff);
    opacity: 0.85;
  }

  /* Desktop header search: just the icon until opened, then one field with the search button inside
     it on the right — styled like the theme's mobile-menu search (pill; square for Bold) */
  .sf-dh-search-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid transparent;
    border-radius: 9999px;
    transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.2s ease, padding 0.25s ease;
  }
  .sf-dh-search-wrap--open {
    padding: 3px 3px 3px 0;
    background: color-mix(in srgb, var(--sf-text, #212529) 5%, var(--sf-bg, #fff));
    border-color: var(--sf-border, #dee2e6);
  }
  .sf-dh-search-wrap--open:focus-within {
    background: var(--sf-bg, #fff);
    border-color: var(--sf-text, #212529);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-text, #212529) 8%, transparent);
  }
  .sf-dh-search {
    width: 0;
    height: 34px;
    box-sizing: border-box;
    opacity: 0;
    border: none;
    padding: 0;
    pointer-events: none;
    font: inherit;
    font-size: 0.875rem;
    background: transparent;
    color: var(--sf-text, #212529);
    outline: none;
    transition: width 0.25s ease, padding 0.25s ease, opacity 0.2s ease, color 0.35s ease;
  }
  .sf-dh-search-wrap--open .sf-dh-search {
    width: 230px;
    opacity: 1;
    padding: 0 8px 0 18px;
    pointer-events: auto;
  }
  .sf-dh-search::placeholder { color: var(--sf-muted, #6c757d); }
  /* Open: the search icon becomes a filled button inside the field */
  .sf-dh-search-wrap--open .sf-icon-btn {
    width: 34px;
    height: 34px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    background: var(--sf-text, #212529);
    color: var(--sf-bg, #fff);
  }
  .sf-dh-search-wrap--open .sf-icon-btn :global(svg) { width: 17px; height: 17px; }
  /* Bold: square field with a thicker border and a square orange button (as in its mobile menu) */
  .sf-header--bold .sf-dh-search-wrap { border-radius: 0; }
  .sf-header--bold .sf-dh-search-wrap--open { border-width: 2px; padding: 2px 2px 2px 0; }
  .sf-header--bold .sf-dh-search-wrap--open .sf-icon-btn {
    border-radius: 0;
    background: var(--sf-primary, #f97316);
    color: var(--sf-on-primary, #fff);
  }
  .sf-header--bold .sf-mobile-search-input { border-radius: 0; border-width: 2px; }

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
  .sf-logo-mobile .sf-logo-img { height: 46px; max-width: 100%; }
  .sf-brand .sf-logo-img { flex-shrink: 0; }

  .sf-mobile-search {
    display: block;
    padding-bottom: 12px;
  }
  /* Rounded "pill" search fields with the icon inside (mobile panel and menu) */
  .sf-search-pill { position: relative; display: block; flex: 1; min-width: 0; }
  .sf-search-pill-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    color: var(--sf-muted, #6c757d);
    pointer-events: none;
  }
  .sf-search-pill-icon :global(svg) { width: 18px; height: 18px; }
  .sf-mobile-search-input {
    width: 100%;
    height: 46px;
    box-sizing: border-box;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    padding: 0 18px 0 44px;
    font: inherit;
    font-size: 1rem; /* >=16px avoids iOS zoom-on-focus */
    background: color-mix(in srgb, var(--sf-text, #212529) 5%, var(--sf-bg, #fff));
    color: var(--sf-text, #212529);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .sf-mobile-search-input::placeholder { color: var(--sf-muted, #6c757d); }
  .sf-mobile-search-input:focus {
    background: var(--sf-bg, #fff);
    border-color: var(--sf-text, #212529);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-text, #212529) 8%, transparent);
  }

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
  .sf-header--immersive .sf-dh-search-wrap--open { background: #1a1a1a; border-color: #333; }
  .sf-header--immersive .sf-dh-search { color: #fff; }
  .sf-header--immersive .sf-dh-search-wrap--open .sf-icon-btn { background: #fff; color: #000; }
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
      height: 76px;
      max-width: 300px;
    }
  }
  /* Header brand: logo with the tagline centred beneath */
  .sf-brand {
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    text-align: center;
  }
  .sf-tagline {
    max-width: 100%;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    line-height: 1.2;
    color: var(--sf-muted, #6c757d);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (min-width: 1024px) {
    .sf-tagline { font-size: 0.6875rem; }
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

  /* ── Main: 32 px bottom gap on mobile (the footer clears the fixed bottom nav itself), 0 on desktop ── */
  .sf-main {
    background: var(--sf-bg, #fff);
    min-height: 60vh;
    color: var(--sf-text, #212529);
    padding-bottom: 32px;
    overflow-x: clip; /* full-bleed sections (home slideshow) must not cause sideways scrolling */
    display: flow-root; /* keep page content's top margin inside main (it showed the body colour) */
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
    padding: 40px 0 0;
    color: var(--sf-text, #212529);
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
  }

  /* Mobile: brand centred on top, link columns in a 2-col grid below */
  .sf-footer-inner {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 24px;
    padding-bottom: 32px;
  }
  /* Mobile: Our Stores and Customer Care stack in the left column, Information fills the right,
     so Customer Care doesn't wait for the longer Information list to end */
  .sf-footer-col--stores { grid-column: 1; grid-row: 2; }
  .sf-footer-col--info { grid-column: 2; grid-row: 2 / span 2; }
  .sf-footer-col--care { grid-column: 1; }
  .sf-footer-brand-col {
    grid-column: 1 / -1;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
  }
  /* Desktop: brand + 2 or 3 link columns (Our Stores only when the owner lists some) */
  @media (min-width: 1024px) {
    .sf-footer { padding-top: 56px; }
    .sf-footer-inner {
      grid-template-columns: minmax(0, 1.5fr) repeat(var(--sf-footer-cols, 3), minmax(0, 1fr));
      gap: 48px;
      padding-bottom: 48px;
    }
    .sf-footer-brand-col {
      grid-column: auto;
      grid-row: auto;
      align-items: flex-start;
      text-align: left;
    }
    .sf-footer-col--stores,
    .sf-footer-col--info,
    .sf-footer-col--care { grid-column: auto; grid-row: auto; }
  }

  .sf-footer-brand-link { text-decoration: none; display: inline-flex; }
  .sf-footer-brand-logo {
    height: 72px;
    width: auto;
    max-width: 240px;
    object-fit: contain;
  }
  @media (min-width: 1024px) {
    .sf-footer-brand-logo { height: 88px; max-width: 300px; }
  }
  .sf-footer-brand-name {
    font-size: 1.375rem;
    font-weight: var(--sf-heading-weight, 700);
    font-family: var(--sf-heading-font, system-ui);
    color: var(--sf-primary, #0d6efd);
  }
  .sf-follow { display: flex; flex-direction: column; gap: 10px; }
  /* "Follow Us" sits under the Customer Care links */
  .sf-footer-heading.sf-footer-follow { margin: 28px 0 2px; } /* beats the plain heading margin below */

  .sf-footer-social {
    display: flex;
    gap: 8px;
  }
  .sf-social-link {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--sf-border, #dee2e6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sf-text, #212529);
    text-decoration: none;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  }
  .sf-social-link:hover {
    background: var(--sf-primary, #0d6efd);
    border-color: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
  }
  .sf-social-link svg { width: 14px; height: 14px; display: block; }

  .sf-footer-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  /* Same plain system font as the cart's "Order Summary" heading: normal case, no letter-spacing */
  .sf-footer-heading {
    margin: 0 0 6px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    color: var(--sf-text, #212529);
  }
  .sf-footer-link {
    color: var(--sf-muted, #6c757d);
    text-decoration: none;
    font-size: 0.875rem;
    line-height: 1.4;
    transition: color 0.15s;
  }
  .sf-footer-link:hover { color: #e53935; }
  .sf-footer-store--plain:hover { color: var(--sf-muted, #6c757d); } /* not a link: no hover colour */

  /* Copyright above "Powered by", both centred, on every screen size */
  .sf-footer-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding-top: 18px;
    padding-bottom: 18px;
    border-top: 1px solid var(--sf-border, #dee2e6);
    text-align: center;
  }
  /* Mobile: keep the bottom row clear of the fixed bottom nav */
  @media (max-width: 1023px) {
    .sf-footer-bottom { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
  }
  .sf-footer-copy,
  .sf-footer-credit {
    margin: 0;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
  }
  .sf-footer-credit-link { color: var(--sf-muted, #6c757d); text-decoration: none; font-weight: 600; }
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
  /* Selected bottom-nav item: red icon, label and top line */
  .sf-bn-item--active { color: #e53935; }
  .sf-bn-item--active::before { background: #e53935; }
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
  .sf-bottom-nav--immersive .sf-bn-item--active { color: #e53935; }

  @media (min-width: 1024px) {
    .sf-bottom-nav { display: none; }
  }

</style>
