<script lang="ts">
  import { goto } from '$app/navigation';
  import { cart } from '$lib/stores/cart';

  let { data }: { data: import('./$types').PageData } = $props();

  let items = $derived(data.items);
  let allCategories = $derived(data.categories);
  let filters = $derived(data.filters);
  let totalPages = $derived(data.totalPages);
  let currentPage = $derived(data.page);
  let store = $derived(data.store);

  // Local filter state (synced from server on each navigation)
  let q = $state(data.filters.q);
  let categoryId = $state(data.filters.categoryId);
  let minPrice = $state(data.filters.minPrice);
  let maxPrice = $state(data.filters.maxPrice);
  let sort = $state(data.filters.sort);

  // Debounce search
  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applyFilters(), 400);
  }

  function applyFilters(newPage = 1) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('category', categoryId);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (newPage > 1) params.set('page', String(newPage));
    goto(`/products?${params.toString()}`, { keepFocus: true });
  }

  function clearFilters() {
    q = '';
    categoryId = '';
    minPrice = '';
    maxPrice = '';
    sort = 'newest';
    goto('/products');
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

  let rootCategories = $derived(allCategories.filter((c) => !c.parentId));
  function childrenOf(parentId: string) {
    return allCategories.filter((c) => c.parentId === parentId);
  }
</script>

<svelte:head>
  <title>Products | {store.name}</title>
</svelte:head>

<div style="max-width:1280px; margin:0 auto; padding:32px 24px; display:flex; gap:32px;">
  <!-- Sidebar filters -->
  <aside style="width:240px; flex-shrink:0;">
    <div style="position:sticky; top:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h2 style="font-size:1rem; font-weight:700; margin:0;">Filters</h2>
        <button
          onclick={clearFilters}
          style="font-size:0.75rem; color:#6b7280; background:none; border:none; cursor:pointer;"
        >
          Clear all
        </button>
      </div>

      <!-- Category tree -->
      <div style="margin-bottom:24px;">
        <p style="font-size:0.8rem; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Category</p>
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer;">
          <input type="radio" name="category" value="" bind:group={categoryId} onchange={() => applyFilters()} />
          <span style="font-size:0.875rem;">All</span>
        </label>
        {#each rootCategories as cat}
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer;">
            <input type="radio" name="category" value={cat.id} bind:group={categoryId} onchange={() => applyFilters()} />
            <span style="font-size:0.875rem;">{cat.name}</span>
          </label>
          {#each childrenOf(cat.id) as child}
            <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; padding-left:20px; cursor:pointer;">
              <input type="radio" name="category" value={child.id} bind:group={categoryId} onchange={() => applyFilters()} />
              <span style="font-size:0.8rem; color:#6b7280;">{child.name}</span>
            </label>
          {/each}
        {/each}
      </div>

      <!-- Price range -->
      <div style="margin-bottom:24px;">
        <p style="font-size:0.8rem; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Price (Rs.)</p>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="number" bind:value={minPrice} placeholder="Min" min="0"
            style="width:80px; border:1px solid #d1d5db; border-radius:6px; padding:6px 8px; font-size:0.8rem;" />
          <span style="color:#9ca3af;">–</span>
          <input type="number" bind:value={maxPrice} placeholder="Max" min="0"
            style="width:80px; border:1px solid #d1d5db; border-radius:6px; padding:6px 8px; font-size:0.8rem;" />
        </div>
        <button onclick={() => applyFilters()}
          style="margin-top:8px; padding:6px 14px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:6px; font-size:0.8rem; cursor:pointer;">
          Apply
        </button>
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <div style="flex:1; min-width:0;">
    <!-- Search + sort bar -->
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:24px; flex-wrap:wrap;">
      <input
        type="search"
        bind:value={q}
        oninput={onSearchInput}
        placeholder="Search products…"
        style="flex:1; min-width:200px; border:1px solid #d1d5db; border-radius:8px; padding:8px 14px; font-size:0.9rem;"
      />
      <select bind:value={sort} onchange={() => applyFilters()}
        style="border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:0.875rem; background:#fff;">
        <option value="newest">Newest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="az">A–Z</option>
        <option value="za">Z–A</option>
      </select>
    </div>

    <!-- Result count -->
    <p style="font-size:0.875rem; color:#6b7280; margin-bottom:20px;">
      {data.total} product{data.total !== 1 ? 's' : ''} found
    </p>

    <!-- Product grid -->
    {#if items.length === 0}
      <div style="text-align:center; padding:64px 0; color:#6b7280;">
        <div style="font-size:3rem; margin-bottom:16px;">🔍</div>
        <p style="font-size:1rem;">No products match your filters.</p>
        <button onclick={clearFilters}
          style="margin-top:12px; padding:8px 20px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:8px; cursor:pointer;">
          Clear Filters
        </button>
      </div>
    {:else}
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:20px;">
        {#each items as product}
          <div style="border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; position:relative;">
            <!-- Out of stock overlay -->
            {#if product.stockQuantity === 0}
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); z-index:1; display:flex; align-items:center; justify-content:center; border-radius:12px;">
                <span style="background:#fff; color:#dc2626; font-size:0.75rem; font-weight:700; padding:4px 12px; border-radius:20px;">Out of Stock</span>
              </div>
            {/if}

            <a href="/products/{product.slug}" style="display:block; text-decoration:none;">
              <div style="aspect-ratio:1; background:#f3f4f6; overflow:hidden;">
                {#if product.imageUrl}
                  <img src={product.imageUrl} alt={product.title} style="width:100%; height:100%; object-fit:cover;" />
                {:else}
                  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2rem; color:#9ca3af;">📦</div>
                {/if}
              </div>
              <div style="padding:14px;">
                <h3 style="font-size:0.9rem; font-weight:600; color:#111827; margin:0 0 8px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">{product.title}</h3>
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                  <span style="font-size:1rem; font-weight:700; color:var(--store-primary,#111827);">
                    Rs. {Number(product.basePrice).toLocaleString()}
                  </span>
                  {#if product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold}
                    <span style="font-size:0.7rem; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:20px;">Low Stock</span>
                  {/if}
                </div>
              </div>
            </a>

            <!-- Quick add to cart -->
            <div style="padding:0 14px 14px;">
              <button
                onclick={() => addToCart(product)}
                disabled={product.stockQuantity === 0}
                style="width:100%; padding:8px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer;"
              >
                Add to Cart
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div style="display:flex; justify-content:center; gap:8px; margin-top:40px; flex-wrap:wrap;">
          {#if currentPage > 1}
            <button onclick={() => applyFilters(currentPage - 1)}
              style="padding:8px 16px; border:1px solid #d1d5db; border-radius:8px; background:#fff; cursor:pointer; font-size:0.875rem;">
              ← Prev
            </button>
          {/if}
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
            <button onclick={() => applyFilters(p)}
              style="padding:8px 14px; border:1px solid {p === currentPage ? 'var(--store-primary,#111827)' : '#d1d5db'}; border-radius:8px; background:{p === currentPage ? 'var(--store-primary,#111827)' : '#fff'}; color:{p === currentPage ? '#fff' : '#374151'}; cursor:pointer; font-size:0.875rem;">
              {p}
            </button>
          {/each}
          {#if currentPage < totalPages}
            <button onclick={() => applyFilters(currentPage + 1)}
              style="padding:8px 16px; border:1px solid #d1d5db; border-radius:8px; background:#fff; cursor:pointer; font-size:0.875rem;">
              Next →
            </button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
