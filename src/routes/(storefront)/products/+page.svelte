<script lang="ts">
  import { goto } from '$app/navigation';
  import { cart, MAX_CART_QTY } from '$lib/stores/cart';
  import { cartDrawerOpen } from '$lib/stores/ui';
  import Seo from '$lib/components/storefront/Seo.svelte';
  import ProductMedia from '$lib/components/storefront/ProductMedia.svelte';
  import { buildCategoryTree } from '$lib/utils/category-tree';

  let { data }: { data: import('./$types').PageData } = $props();

  let items = $derived(data.items);
  let allCategories = $derived(data.categories);
  // Filter chips list top-level categories only; picking one also shows its subcategories' products
  let filterCategories = $derived(buildCategoryTree(allCategories));
  // Chips toggle: click to add a category to the filter, click again to remove it. Several can be
  // selected at once. A subcategory opened from the menu highlights (and is cleared with) its parent.
  type FilterCategory = (typeof filterCategories)[number];
  const familyIds = (cat: FilterCategory) => [cat.id, ...cat.children.map((c) => c.id)];
  function chipActive(cat: FilterCategory): boolean {
    return familyIds(cat).some((id) => categoryIds.includes(id));
  }
  function toggleCategory(cat: FilterCategory) {
    if (chipActive(cat)) {
      const family = familyIds(cat);
      categoryIds = categoryIds.filter((id) => !family.includes(id));
    } else {
      categoryIds = [...categoryIds, cat.id];
    }
  }
  let totalPages = $derived(data.totalPages);
  let currentPage = $derived(data.page);
  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');

  // Local filter state (synced from server on each navigation)
  let q = $state(data.filters.q);
  let categoryIds = $state<string[]>(data.filters.categoryIds);
  let maxPrice = $state(data.filters.maxPrice);
  let inStockOnly = $state(data.filters.inStockOnly);
  let onSaleOnly = $state(data.filters.onSaleOnly);
  let sort = $state(data.filters.sort);

  // This page stays mounted when the address changes (nav link, category link, back button), so the
  // controls must follow the filters in the URL. Without this the last category you picked stayed
  // highlighted after going back to "All Products", while the list showed everything.
  $effect(() => {
    const f = data.filters;
    q = f.q;
    categoryIds = f.categoryIds;
    maxPrice = f.maxPrice;
    inStockOnly = f.inStockOnly;
    onSaleOnly = f.onSaleOnly;
    sort = f.sort;
  });

  // Filter bottom sheet state (AC-6)
  let filterOpen = $state(false);
  function openFilters() { filterOpen = true; }
  function closeFilters() { filterOpen = false; }

  // Debounced apply, for the price slider while it's being dragged
  let applyTimeout: ReturnType<typeof setTimeout>;
  function scheduleApply() {
    clearTimeout(applyTimeout);
    applyTimeout = setTimeout(() => applyFilters(), 400);
  }

  function applyFilters(newPage = 1) {
    filterOpen = false;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryIds.length > 0) params.set('category', categoryIds.join(','));
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStockOnly) params.set('inStock', '1');
    if (onSaleOnly) params.set('onSale', '1');
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (newPage > 1) params.set('page', String(newPage));
    goto(`${basePath}/products?${params.toString()}`, { keepFocus: true });
  }

  function clearFilters() {
    q = '';
    categoryIds = [];
    maxPrice = '';
    inStockOnly = false;
    onSaleOnly = false;
    sort = 'newest';
    goto(`${basePath}/products`);
    filterOpen = false;
  }

  // Per-product "just added" feedback state
  let added = $state<Record<string, boolean>>({});
  let addedTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  // Per-product "max stock reached" message shown on the card
  let stockMsg = $state<Record<string, string>>({});
  let stockMsgTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  function addToCart(item: (typeof items)[0]) {
    if (item.stockQty === 0) return;
    // Variants must be chosen on the details page — never add a bare product
    if (item.hasVariants) {
      goto(`${basePath}/products/${item.slug}`);
      return;
    }
    // Stock is verified at "Proceed to Checkout"; here only the per-item limit applies
    const inCart = $cart
      .filter((c) => c.productId === item.id && Object.keys(c.variantSelections ?? {}).length === 0)
      .reduce((sum, c) => sum + c.quantity, 0);
    if (inCart >= MAX_CART_QTY) {
      stockMsg[item.id] = `Maximum ${MAX_CART_QTY} per item`;
      clearTimeout(stockMsgTimers[item.id]);
      stockMsgTimers[item.id] = setTimeout(() => { stockMsg[item.id] = ''; }, 2500);
      return;
    }
    cart.addItem({
      productId: item.id,
      title: item.title,
      slug: item.slug,
      imageUrl: item.imageUrl ?? undefined,
      price: Number(item.salePrice ?? item.basePrice),
      quantity: 1
    });
    // Show "Added ✓" for ~1 s, then revert
    added[item.id] = true;
    clearTimeout(addedTimers[item.id]);
    addedTimers[item.id] = setTimeout(() => { added[item.id] = false; }, 1000);
    cartDrawerOpen.set(true);
  }

  let isBold = $derived(store.theme === 'bold');
  let cardLayout = $derived(
    store.theme === 'minimal' ? 'editorial'
    : store.theme === 'bold' ? 'overlay'
    : 'vertical'
  );

  // Top of the price slider; the slider's end means "any price"
  const PRICE_MAX = 50000;

  // Active filters as removable chips above the grid. Built from the applied filters (the URL),
  // so unapplied changes in the mobile sheet don't show until "Show results".
  type ActiveChip = { key: string; label: string; remove: () => void };
  let activeChips = $derived.by<ActiveChip[]>(() => {
    const f = data.filters;
    const names = new Map(allCategories.map((c) => [c.id, c.name]));
    const chips: ActiveChip[] = [];
    if (f.q) chips.push({ key: 'q', label: `Search: "${f.q}"`, remove: () => { q = ''; applyFilters(); } });
    for (const id of f.categoryIds) {
      const name = names.get(id);
      if (name) chips.push({ key: `cat-${id}`, label: name, remove: () => { categoryIds = f.categoryIds.filter((x) => x !== id); applyFilters(); } });
    }
    if (f.maxPrice) {
      chips.push({ key: 'price', label: `Under ${store.currencySymbol} ${Number(f.maxPrice).toLocaleString()}`, remove: () => { maxPrice = ''; applyFilters(); } });
    }
    if (f.inStockOnly) chips.push({ key: 'stock', label: 'In stock', remove: () => { inStockOnly = false; applyFilters(); } });
    if (f.onSaleOnly) chips.push({ key: 'sale', label: 'On sale', remove: () => { onSaleOnly = false; applyFilters(); } });
    return chips;
  });
  // Filters-button badge counts filters only, not a search made from the header
  let activeFiltersCount = $derived(activeChips.filter((c) => c.key !== 'q').length);
</script>

<svelte:head>
  <title>Products | {store.name}</title>
</svelte:head>

<Seo
  {store}
  title="Products | {store.name}"
  description="Browse all products at {store.name}"
/>

<!-- Filter controls shared by the desktop sidebar (live: each change applies at once) and the
     mobile sheet (changes apply with "Show results") -->
{#snippet filterControls(live: boolean)}
  <section class="fc-section">
    <h3 class="fc-title">Categories</h3>
    <div class="fc-options">
      {#each filterCategories as cat}
        {@const on = chipActive(cat)}
        <button type="button" role="checkbox" aria-checked={on} class="fc-option" class:fc-option--on={on}
          onclick={() => { toggleCategory(cat); if (live) applyFilters(); }}>
          <span class="fc-box" aria-hidden="true">
            {#if on}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7"/></svg>
            {/if}
          </span>
          <span class="fc-option-name">{cat.name}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="fc-section">
    <div class="fc-title-row">
      <h3 class="fc-title">Max price</h3>
      <span class="fc-value">{maxPrice ? `${store.currencySymbol} ${Number(maxPrice).toLocaleString()}` : 'Any'}</span>
    </div>
    <input
      type="range"
      min="0"
      max={PRICE_MAX}
      step="500"
      value={maxPrice || PRICE_MAX}
      style="--pct:{((Number(maxPrice) || PRICE_MAX) / PRICE_MAX) * 100}%"
      oninput={(e) => {
        const v = (e.target as HTMLInputElement).value;
        maxPrice = v === String(PRICE_MAX) ? '' : v;
        if (live) scheduleApply();
      }}
      class="fc-range"
      aria-label="Maximum price"
    />
    <div class="fc-range-labels">
      <span>{store.currencySymbol} 0</span>
      <span>{store.currencySymbol} {PRICE_MAX.toLocaleString()}+</span>
    </div>
  </section>

  <section class="fc-section">
    <h3 class="fc-title">Availability</h3>
    <label class="fc-switch">
      <span>In stock only</span>
      <input type="checkbox" bind:checked={inStockOnly} onchange={() => live && applyFilters()} />
      <span class="fc-switch-track" aria-hidden="true"></span>
    </label>
    <label class="fc-switch">
      <span>On sale only</span>
      <input type="checkbox" bind:checked={onSaleOnly} onchange={() => live && applyFilters()} />
      <span class="fc-switch-track" aria-hidden="true"></span>
    </label>
  </section>
{/snippet}

<!-- Filter bottom sheet backdrop -->
{#if filterOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="filter-backdrop" onclick={closeFilters}></div>
{/if}

<!-- Filter bottom sheet (mobile) -->
<div class="filter-sheet" class:filter-sheet--open={filterOpen} role="dialog" aria-modal="true" aria-label="Filters">
  <div class="filter-sheet-handle"></div>
  <div class="filter-sheet-header">
    <h2 class="filter-sheet-title">Filters</h2>
    <button class="filter-sheet-close" onclick={closeFilters} aria-label="Close filters">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
      </svg>
    </button>
  </div>
  <div class="filter-sheet-body">
    {@render filterControls(false)}
  </div>
  <div class="filter-sheet-footer">
    <button class="filter-btn-clear" onclick={clearFilters}>Clear all</button>
    <button class="filter-btn-apply" onclick={() => applyFilters()}>Show results</button>
  </div>
</div>

<!-- Desktop: sidebar + content col. Mobile: content only (sidebar hidden via CSS). -->
<div class="products-layout">

  <!-- Permanent filter sidebar (desktop only via CSS) -->
  <aside class="products-sidebar" aria-label="Filters">
    <div class="fc-head">
      <h2 class="fc-head-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/>
        </svg>
        Filters
      </h2>
      {#if activeFiltersCount > 0}
        <button class="fc-clear" onclick={clearFilters}>Clear all</button>
      {/if}
    </div>
    {@render filterControls(true)}
  </aside>

  <!-- Main content column -->
  <div class="products-content">
    <!-- Toolbar: filters button (mobile) and sort. Searching is done from the header. -->
    <div class="products-topbar">
      <div class="products-tools">
        <button class="products-filter-btn" onclick={openFilters} aria-label="Filters ({activeFiltersCount} active)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/>
          </svg>
          Filters
          {#if activeFiltersCount > 0}<span class="filter-count-badge">{activeFiltersCount}</span>{/if}
        </button>
        <label class="products-sort-wrap">
          <span class="products-sort-label">Sort by</span>
          <select bind:value={sort} onchange={() => applyFilters()} class="products-sort">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="az">Name: A–Z</option>
            <option value="za">Name: Z–A</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Result count + active filters, each removable -->
    <div class="products-status">
      <p class="products-count"><strong>{data.total}</strong> product{data.total !== 1 ? 's' : ''}</p>
      {#if activeChips.length > 0}
        <div class="active-chips">
          {#each activeChips as chip (chip.key)}
            <button class="active-chip" onclick={chip.remove} aria-label="Remove filter {chip.label}">
              {chip.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </button>
          {/each}
          <button class="clear-link" onclick={clearFilters}>Clear all</button>
        </div>
      {/if}
    </div>

    <!-- Product grid -->
    {#if items.length === 0}
      <div class="products-empty">
        <div class="products-empty-icon">🔍</div>
        <p>No products match your filters.</p>
        <button onclick={clearFilters} class="btn-primary" style="background:var(--sf-primary); color:var(--sf-on-primary);">Clear Filters</button>
      </div>
    {:else}
      <div class="products-grid products-grid--{cardLayout}">
        {#each items as product}
          <div class="product-card-wrap" class:product-card-wrap--full={store.theme !== 'basic'}>
            <!-- Out of stock overlay -->
            {#if product.stockQty === 0}
              <div class="oos-overlay">
                <span class="oos-badge">Out of Stock</span>
              </div>
            {/if}

            <!-- Bold: no orange border / offset shadow behind the card -->
            <div class="product-card product-card--{cardLayout}" style={isBold ? 'border-radius:var(--sf-radius-lg);' : 'border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);'}>
              <div class="product-card-img-wrap">
                <ProductMedia
                  src={product.imageUrl}
                  alt={product.title}
                  href="{basePath}/products/{product.slug}"
                  shareUrl="{basePath}/products/{product.slug}"
                  shareTitle="{product.title} | {store.name}"
                />
              </div>
              <a href="{basePath}/products/{product.slug}" class="product-card-info">
                <h3 class="product-card-title">{product.title}</h3>
                <div class="product-card-pricing">
                  {#if product.salePrice}
                    <span class="price-sale" style="color:var(--sf-primary);">{store.currencySymbol} {Number(product.salePrice).toLocaleString()}</span>
                    <span class="price-orig">{store.currencySymbol} {Number(product.basePrice).toLocaleString()}</span>
                  {:else}
                    <span class="price-base" style="color:var(--sf-primary);">{store.currencySymbol} {Number(product.basePrice).toLocaleString()}</span>
                  {/if}
                  {#if product.stockQty > 0 && product.stockQty <= product.lowStockThreshold}
                    <span class="badge-low-stock">Low Stock</span>
                  {/if}
                </div>
              </a>
            </div>

            <!-- Quick add -->
            <div class="product-card-action">
              <button
                onclick={() => addToCart(product)}
                disabled={product.stockQty === 0}
                class="btn-add-cart"
                class:btn-add-cart--added={added[product.id]}
                style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-radius);"
              >
                {added[product.id] ? 'Added ✓' : 'Add to Cart'}
              </button>
              {#if stockMsg[product.id]}
                <p class="stock-msg" role="alert">{stockMsg[product.id]}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          {#if currentPage > 1}
            <button onclick={() => applyFilters(currentPage - 1)} class="page-btn">← Prev</button>
          {/if}
          {#each Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1) as p}
            <button onclick={() => applyFilters(p)}
              class="page-btn"
              class:page-btn--active={p === currentPage}
              style={p === currentPage ? `background:var(--sf-primary); color:var(--sf-on-primary); border-color:var(--sf-primary);` : ''}
            >
              {p}
            </button>
          {/each}
          {#if currentPage < totalPages}
            <button onclick={() => applyFilters(currentPage + 1)} class="page-btn">Next →</button>
          {/if}
        </div>
      {/if}
    {/if}
  </div><!-- .products-content -->
</div><!-- .products-layout -->

<style>
  /* ── Filter controls (shared by the desktop sidebar and the mobile sheet) ── */
  .fc-section {
    padding: 18px 0;
    border-top: 1px solid var(--sf-border, #dee2e6);
  }
  .fc-section:first-of-type { border-top: none; padding-top: 4px; }
  .fc-title {
    margin: 0 0 12px;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--sf-text, #212529);
  }
  .fc-title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .fc-title-row .fc-title { margin: 0; }
  .fc-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sf-text, #212529);
    padding: 2px 10px;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--sf-text, #212529) 7%, transparent);
  }

  /* Category rows with a tick box (several can be selected) */
  .fc-options { display: flex; flex-direction: column; gap: 2px; }
  .fc-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 8px;
    margin-inline: -8px;
    box-sizing: content-box;
    border: none;
    border-radius: var(--sf-radius, 6px);
    background: none;
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .fc-option:hover { background: color-mix(in srgb, var(--sf-text, #212529) 6%, transparent); }
  .fc-box {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 5px;
    border: 1.5px solid var(--sf-border, #ced4da);
    background: var(--sf-bg, #fff);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .fc-option--on .fc-box {
    background: var(--sf-primary, #0d6efd);
    border-color: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
  }
  .fc-option--on .fc-option-name { font-weight: 600; }

  /* Price slider: track filled up to the thumb */
  .fc-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: linear-gradient(
      to right,
      var(--sf-primary, #0d6efd) 0 var(--pct, 100%),
      var(--sf-border, #dee2e6) var(--pct, 100%) 100%
    );
    outline: none;
    cursor: pointer;
  }
  .fc-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--sf-bg, #fff);
    border: 2px solid var(--sf-primary, #0d6efd);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
  .fc-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--sf-bg, #fff);
    border: 2px solid var(--sf-primary, #0d6efd);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
  .fc-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-primary, #0d6efd) 25%, transparent); }
  .fc-range-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
  }

  /* Availability switches */
  .fc-switch {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    font-size: 0.875rem;
    color: var(--sf-text, #212529);
    cursor: pointer;
  }
  .fc-switch input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .fc-switch-track {
    position: relative;
    width: 38px;
    height: 22px;
    flex-shrink: 0;
    border-radius: 9999px;
    background: var(--sf-border, #ced4da);
    transition: background-color 0.2s ease;
  }
  .fc-switch-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s ease;
  }
  .fc-switch input:checked + .fc-switch-track { background: var(--sf-primary, #0d6efd); }
  .fc-switch input:checked + .fc-switch-track::after {
    transform: translateX(16px);
    background: var(--sf-on-primary, #fff); /* stays visible when the primary colour is light (dark mode) */
  }
  .fc-switch input:focus-visible + .fc-switch-track { outline: 2px solid var(--sf-primary, #0d6efd); outline-offset: 2px; }

  /* ── Mobile filter sheet ── */
  .filter-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 50;
  }
  .filter-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    border-radius: 18px 18px 0 0;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
    z-index: 60;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }
  .filter-sheet--open { transform: translateY(0); }
  .filter-sheet-handle {
    width: 40px;
    height: 4px;
    background: var(--sf-border, #dee2e6);
    border-radius: 2px;
    margin: 10px auto 0;
    flex-shrink: 0;
  }
  .filter-sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
    flex-shrink: 0;
  }
  .filter-sheet-title { font-size: 1.0625rem; font-weight: 700; margin: 0; }
  .filter-sheet-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--sf-muted, #6c757d);
    padding: 4px;
    display: flex;
  }
  .filter-sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
  }
  .filter-sheet-footer {
    display: flex;
    gap: 12px;
    padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--sf-border, #dee2e6);
    flex-shrink: 0;
  }
  .filter-btn-clear {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    background: transparent;
    color: var(--sf-text, #212529);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .filter-btn-apply {
    flex: 2;
    padding: 12px;
    border: none;
    border-radius: var(--sf-radius, 6px);
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  /* ── Toolbar: search / filters (mobile) / sort ── */
  .products-topbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 16px 0 12px;
  }
  .products-tools { display: flex; gap: 10px; }
  .products-filter-btn {
    position: relative;
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 42px;
    padding: 0 16px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .filter-count-badge {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 9999px;
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    font-size: 0.6875rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  /* Sort: "Sort by" label inside a pill with the select, custom chevron */
  .products-sort-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    height: 42px;
    padding-left: 16px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    background: var(--sf-bg, #fff);
    cursor: pointer;
  }
  .products-sort-wrap::after {
    content: '';
    position: absolute;
    right: 16px;
    top: 50%;
    width: 7px;
    height: 7px;
    border-right: 2px solid var(--sf-muted, #6c757d);
    border-bottom: 2px solid var(--sf-muted, #6c757d);
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }
  .products-sort-wrap:focus-within { border-color: var(--sf-primary, #0d6efd); }
  .products-sort-label {
    font-size: 0.8125rem;
    color: var(--sf-muted, #6c757d);
    white-space: nowrap;
  }
  .products-sort {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 36px 0 6px;
    border: none;
    background: transparent;
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }
  .products-sort option { color: #212529; background: #fff; }

  /* Count + removable active-filter chips */
  .products-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin: 0 0 18px;
  }
  .products-count {
    margin: 0;
    font-size: 0.875rem;
    color: var(--sf-muted, #6c757d);
  }
  .products-count strong { color: var(--sf-text, #212529); }
  .active-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .active-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px 5px 12px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    background: color-mix(in srgb, var(--sf-text, #212529) 5%, var(--sf-bg, #fff));
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .active-chip:hover { border-color: #e53935; color: #e53935; }
  .clear-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--sf-muted, #6c757d);
    font: inherit;
    font-size: 0.8125rem;
    text-decoration: underline;
    cursor: pointer;
  }
  .clear-link:hover { color: var(--sf-text, #212529); }

  /* ── Desktop: sidebar layout ── */
  .products-layout { display: block; }
  .products-sidebar { display: none; } /* mobile uses the sheet */
  @media (min-width: 1024px) {
    .products-layout {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      gap: 40px;
      align-items: start;
    }
    .products-sidebar {
      display: block;
      position: sticky;
      top: 112px;
      margin-top: 16px;
      background: var(--sf-bg, #fff);
      border: 1px solid var(--sf-border, #dee2e6);
      border-radius: var(--sf-radius-lg, 12px);
      padding: 18px 20px 6px;
    }
    .fc-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--sf-border, #dee2e6);
    }
    .fc-head-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--sf-text, #212529);
    }
    .fc-clear {
      background: none;
      border: none;
      padding: 0;
      color: #e53935;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }
    .fc-section:first-of-type { padding-top: 14px; }
    /* Toolbar: sort on the right */
    .products-topbar { flex-direction: row; align-items: center; gap: 12px; }
    .products-tools { margin-left: auto; flex: 0 0 auto; }
    .products-sort-wrap { flex: 0 0 auto; min-width: 250px; }
    /* Hide the mobile filter button and sheet */
    .products-filter-btn,
    .filter-sheet,
    .filter-backdrop { display: none !important; }
  }

  /* ── Product grid: 2-col mobile, 3-col desktop ── */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (min-width: 1024px) {
    .products-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }
  }
  .product-card-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .oos-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--sf-radius-lg, 12px);
    pointer-events: none;
  }
  .oos-badge {
    background: #fff;
    color: #dc2626;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: var(--sf-pill, 9999px);
  }
  .product-card {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: var(--sf-text, #212529);
    background: var(--sf-surface, #fff);
    overflow: hidden;
    flex: 1;
  }
  /* vertical (basic) */
  .product-card--vertical .product-card-img-wrap { aspect-ratio: 1; }
  /* editorial (minimal) */
  .product-card--editorial .product-card-img-wrap { aspect-ratio: 3/4; }
  /* overlay (bold) */
  .product-card--overlay { position: relative; }
  .product-card--overlay .product-card-img-wrap { aspect-ratio: 1; }
  .product-card--overlay .product-card-info {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 8px 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.75));
    color: #fff;
  }
  .product-card--overlay .price-base,
  .product-card--overlay .price-sale { color: #fff !important; }
  .product-card-img-wrap {
    width: 100%;
    overflow: hidden;
    background: var(--sf-bg, #f8f9fa);
  }
  .product-card-info {
    display: block;
    padding: 10px;
    text-decoration: none;
    color: inherit;
  }
  .product-card-title {
    font-size: 0.8125rem;
    font-weight: 600;
    margin: 0 0 6px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .product-card-pricing {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }
  .price-base, .price-sale {
    font-size: 0.875rem;
    font-weight: 700;
  }
  .price-orig {
    font-size: 0.75rem;
    text-decoration: line-through;
    color: var(--sf-muted, #6c757d);
  }
  .badge-low-stock {
    font-size: 0.65rem;
    background: #fef3c7;
    color: #d97706;
    padding: 2px 6px;
    border-radius: var(--sf-pill, 9999px);
  }
  .product-card-action {
    padding: 0 10px 10px;
  }
  /* Minimal / Bold / Playful / Custom: the button runs edge to edge under the card, a bit taller */
  .product-card-wrap--full .product-card-action {
    padding: 8px 0 0;
  }
  .product-card-wrap--full .btn-add-cart {
    padding: 11px 12px;
    font-size: 0.875rem;
  }
  .stock-msg {
    margin: 6px 0 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #dc2626;
    text-align: center;
  }
  .btn-add-cart {
    width: 100%;
    padding: 7px;
    border: none;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s;
  }
  /* Hover: lifts slightly */
  .btn-add-cart:not(:disabled):hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  }
  .btn-add-cart:not(:disabled):active { transform: translateY(0); box-shadow: none; }
  /* Just added: a quick bounce */
  .btn-add-cart--added { animation: btn-added-bounce 0.6s ease; }
  @keyframes btn-added-bounce {
    0% { transform: translateY(0) scale(1); }
    25% { transform: translateY(-6px) scale(1.04); }
    45% { transform: translateY(0) scale(0.97); }
    65% { transform: translateY(-3px) scale(1.01); }
    100% { transform: translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .btn-add-cart:not(:disabled):hover { transform: none; }
    .btn-add-cart--added { animation: none; }
  }
  .btn-add-cart:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── Empty state ── */
  .products-empty {
    text-align: center;
    padding: 48px 0;
    color: var(--sf-muted, #6c757d);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .products-empty-icon { font-size: 3rem; }
  .btn-primary {
    padding: 10px 24px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--sf-radius, 6px);
  }

  /* ── Pagination ── */
  .pagination {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin: 24px 0;
  }
  .page-btn {
    padding: 7px 12px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    background: var(--sf-surface, #fff);
    color: var(--sf-text, #212529);
    cursor: pointer;
    font-size: 0.875rem;
  }
</style>
