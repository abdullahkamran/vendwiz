<script lang="ts">
  import { goto } from '$app/navigation';
  import { cart } from '$lib/stores/cart';

  let { data }: { data: import('./$types').PageData } = $props();

  let items = $derived(data.items);
  let allCategories = $derived(data.categories);
  let totalPages = $derived(data.totalPages);
  let currentPage = $derived(data.page);
  let store = $derived(data.store);

  // Local filter state (synced from server on each navigation)
  let q = $state(data.filters.q);
  let categoryId = $state(data.filters.categoryId);
  let maxPrice = $state(data.filters.maxPrice);
  let inStockOnly = $state(data.filters.inStockOnly);
  let onSaleOnly = $state(data.filters.onSaleOnly);
  let sort = $state(data.filters.sort);

  // Filter bottom sheet state (AC-6)
  let filterOpen = $state(false);
  function openFilters() { filterOpen = true; }
  function closeFilters() { filterOpen = false; }

  // Debounce search
  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applyFilters(), 400);
  }

  function applyFilters(newPage = 1) {
    filterOpen = false;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('category', categoryId);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStockOnly) params.set('inStock', '1');
    if (onSaleOnly) params.set('onSale', '1');
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (newPage > 1) params.set('page', String(newPage));
    goto(`/products?${params.toString()}`, { keepFocus: true });
  }

  function clearFilters() {
    q = '';
    categoryId = '';
    maxPrice = '';
    inStockOnly = false;
    onSaleOnly = false;
    sort = 'newest';
    goto('/products');
    filterOpen = false;
  }

  function addToCart(item: (typeof items)[0]) {
    cart.addItem({
      productId: item.id,
      title: item.title,
      slug: item.slug,
      imageUrl: item.imageUrl ?? undefined,
      price: Number(item.basePrice),
      quantity: 1
    });
  }

  let cardLayout = $derived(
    store.theme === 'minimal' ? 'editorial'
    : store.theme === 'bold' ? 'overlay'
    : store.theme === 'playful' ? 'horizontal'
    : 'vertical'
  );

  let activeFiltersCount = $derived(
    (categoryId ? 1 : 0) + (maxPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (onSaleOnly ? 1 : 0)
  );
</script>

<svelte:head>
  <title>Products | {store.name}</title>
</svelte:head>

<!-- Filter bottom sheet backdrop -->
{#if filterOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="filter-backdrop" onclick={closeFilters}></div>
{/if}

<!-- Filter bottom sheet (AC-6) -->
<div class="filter-sheet" class:filter-sheet--open={filterOpen} role="dialog" aria-modal="true" aria-label="Filters">
  <div class="filter-sheet-handle"></div>
  <div class="filter-sheet-header">
    <h2 class="filter-sheet-title">Filters</h2>
    <button class="filter-sheet-close" onclick={closeFilters} aria-label="Close filters">✕</button>
  </div>

  <div class="filter-sheet-body">
    <!-- Category chips -->
    <div class="filter-group">
      <p class="filter-label">Category</p>
      <div class="filter-chips">
        <button
          class="filter-chip"
          class:filter-chip--active={!categoryId}
          onclick={() => { categoryId = ''; }}
        >All</button>
        {#each allCategories as cat}
          <button
            class="filter-chip"
            class:filter-chip--active={categoryId === cat.id}
            onclick={() => { categoryId = cat.id; }}
          >{cat.name}</button>
        {/each}
      </div>
    </div>

    <!-- Max price range slider -->
    <div class="filter-group">
      <p class="filter-label">Max Price: Rs. {maxPrice || '∞'}</p>
      <input
        type="range"
        min="0"
        max="50000"
        step="500"
        value={maxPrice || 50000}
        oninput={(e) => { maxPrice = (e.target as HTMLInputElement).value === '50000' ? '' : (e.target as HTMLInputElement).value; }}
        class="filter-range"
      />
      <div class="filter-range-labels">
        <span>Rs. 0</span>
        <span>Rs. 50,000</span>
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="filter-group">
      <label class="filter-check">
        <input type="checkbox" bind:checked={inStockOnly} />
        <span>In Stock Only</span>
      </label>
      <label class="filter-check">
        <input type="checkbox" bind:checked={onSaleOnly} />
        <span>On Sale Only</span>
      </label>
    </div>
  </div>

  <div class="filter-sheet-footer">
    <button class="filter-btn-clear" onclick={clearFilters}>Clear All</button>
    <button class="filter-btn-apply" onclick={() => applyFilters()} style="background:var(--sf-primary); color:var(--sf-on-primary);">
      Apply Filters
    </button>
  </div>
</div>

<!-- Search + filter trigger bar -->
<div class="products-topbar">
  <input
    type="search"
    bind:value={q}
    oninput={onSearchInput}
    placeholder="Search products…"
    class="products-search"
  />
  <button class="products-filter-btn" onclick={openFilters} style="background:var(--sf-primary); color:var(--sf-on-primary);">
    ⚙ Filters
    {#if activeFiltersCount > 0}
      <span class="filter-count-badge">{activeFiltersCount}</span>
    {/if}
  </button>
  <select bind:value={sort} onchange={() => applyFilters()} class="products-sort">
    <option value="newest">Newest</option>
    <option value="price_asc">Price: Low→High</option>
    <option value="price_desc">Price: High→Low</option>
    <option value="az">A–Z</option>
    <option value="za">Z–A</option>
  </select>
</div>

<!-- Result count -->
<p class="products-count">
  {data.total} product{data.total !== 1 ? 's' : ''}
  {#if activeFiltersCount > 0}<button class="clear-link" onclick={clearFilters}>Clear filters</button>{/if}
</p>

<!-- Product grid -->
{#if items.length === 0}
  <div class="products-empty">
    <div class="products-empty-icon">🔍</div>
    <p>No products match your filters.</p>
    <button onclick={clearFilters} class="btn-primary" style="background:var(--sf-primary); color:var(--sf-on-primary);">Clear Filters</button>
  </div>
{:else}
  <div class="products-grid">
    {#each items as product}
      <div class="product-card-wrap">
        <!-- Out of stock overlay -->
        {#if product.stockQty === 0}
          <div class="oos-overlay">
            <span class="oos-badge">Out of Stock</span>
          </div>
        {/if}

        <a href="/products/{product.slug}" class="product-card product-card--{cardLayout}" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);">
          <div class="product-card-img-wrap">
            {#if product.imageUrl}
              <img src={product.imageUrl} alt={product.title} class="product-card-img" />
            {:else}
              <div class="product-card-img-ph">📦</div>
            {/if}
          </div>
          <div class="product-card-info">
            <h3 class="product-card-title">{product.title}</h3>
            <div class="product-card-pricing">
              {#if product.salePrice}
                <span class="price-sale" style="color:var(--sf-primary);">Rs. {Number(product.salePrice).toLocaleString()}</span>
                <span class="price-orig">Rs. {Number(product.basePrice).toLocaleString()}</span>
              {:else}
                <span class="price-base" style="color:var(--sf-primary);">Rs. {Number(product.basePrice).toLocaleString()}</span>
              {/if}
              {#if product.stockQty > 0 && product.stockQty <= product.lowStockThreshold}
                <span class="badge-low-stock">Low Stock</span>
              {/if}
            </div>
          </div>
        </a>

        <!-- Quick add -->
        <div class="product-card-action">
          <button
            onclick={() => addToCart(product)}
            disabled={product.stockQty === 0}
            class="btn-add-cart"
            style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-radius);"
          >
            Add to Cart
          </button>
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

<style>
  /* ── Filter bottom sheet ── */
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
    background: var(--sf-surface, #fff);
    color: var(--sf-text, #212529);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
    z-index: 60;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }
  .filter-sheet--open {
    transform: translateY(0);
  }
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
  .filter-sheet-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }
  .filter-sheet-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: var(--sf-muted, #6c757d);
    padding: 4px;
  }
  .filter-sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .filter-sheet-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--sf-border, #dee2e6);
    flex-shrink: 0;
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .filter-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sf-muted, #6c757d);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .filter-chip {
    padding: 6px 14px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-pill, 9999px);
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .filter-chip--active {
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    border-color: var(--sf-primary, #0d6efd);
  }
  .filter-range {
    width: 100%;
    accent-color: var(--sf-primary, #0d6efd);
  }
  .filter-range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
  }
  .filter-check {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .filter-check input {
    width: 18px;
    height: 18px;
    accent-color: var(--sf-primary, #0d6efd);
    cursor: pointer;
  }
  .filter-btn-clear {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    background: transparent;
    color: var(--sf-text, #212529);
    font-weight: 600;
    cursor: pointer;
  }
  .filter-btn-apply {
    flex: 2;
    padding: 12px;
    border: none;
    border-radius: var(--sf-radius, 6px);
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9375rem;
  }

  /* ── Top bar ── */
  .products-topbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 16px 0 12px;
    flex-wrap: nowrap;
  }
  .products-search {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    padding: 8px 12px;
    font-size: 0.875rem;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
  }
  .products-filter-btn {
    position: relative;
    padding: 8px 14px;
    border: none;
    border-radius: var(--sf-radius, 6px);
    font-weight: 600;
    font-size: 0.8125rem;
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .filter-count-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: #fff;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .products-sort {
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    padding: 8px;
    font-size: 0.8125rem;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    flex-shrink: 0;
  }
  .products-count {
    font-size: 0.8125rem;
    color: var(--sf-muted, #6c757d);
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .clear-link {
    background: none;
    border: none;
    color: var(--sf-primary, #0d6efd);
    cursor: pointer;
    font-size: 0.8125rem;
    padding: 0;
  }

  /* ── Product grid ── */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
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
  /* horizontal-row (playful) */
  .product-card--horizontal {
    flex-direction: row;
    align-items: center;
  }
  .product-card--horizontal .product-card-img-wrap {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }
  .product-card--horizontal .product-card-info { padding: 8px 10px; flex: 1; }

  .product-card-img-wrap {
    width: 100%;
    overflow: hidden;
    background: var(--sf-bg, #f8f9fa);
  }
  .product-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .product-card-img-ph {
    width: 100%;
    height: 100%;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--sf-muted, #9ca3af);
  }
  .product-card-info {
    padding: 10px;
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
  .btn-add-cart {
    width: 100%;
    padding: 7px;
    border: none;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
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
