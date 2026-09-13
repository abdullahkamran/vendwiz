<script lang="ts">
  import type { PageData } from './$types';
  import type { Category } from '$lib/db/schema';

  let { data }: { data: PageData } = $props();

  type ProductRow = {
    id: string;
    title: string;
    slug: string;
    categoryId: string | null;
    basePrice: string;
    isActive: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    primaryImage: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  let categories = $state<Category[]>(data.categories as Category[]);
  let products = $state<ProductRow[]>([]);
  let total = $state(0);
  let page = $state(1);
  let pages = $state(1);
  let loading = $state(false);
  let search = $state('');
  let filterCategory = $state('');
  let filterStatus = $state('');
  let deleteTarget = $state<ProductRow | null>(null);
  let lowStockCount = $state(0);
  let outOfStockCount = $state(0);

  async function loadProducts() {
    loading = true;
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      ...(search && { search }),
      ...(filterCategory && { category: filterCategory }),
      ...(filterStatus && { status: filterStatus })
    });
    try {
      const res = await fetch(`/api/admin/products?${params}`);
      if (res.ok) {
        const json = await res.json();
        products = json.data;
        total = json.total;
        pages = json.pages;
      }
    } finally {
      loading = false;
    }
  }

  async function loadStockCounts() {
    const res = await fetch('/api/admin/products/low-stock-count');
    if (res.ok) {
      const j = await res.json();
      lowStockCount = j.lowStock;
      outOfStockCount = j.outOfStock;
    }
  }

  // Initial load
  $effect(() => {
    loadProducts();
    loadStockCounts();
  });

  function handleSearch(e: Event) {
    search = (e.target as HTMLInputElement).value;
    page = 1;
    loadProducts();
  }

  function handleFilter() {
    page = 1;
    loadProducts();
  }

  function prevPage() {
    if (page > 1) {
      page--;
      loadProducts();
    }
  }

  function nextPage() {
    if (page < pages) {
      page++;
      loadProducts();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    deleteTarget = null;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadProducts();
      loadStockCounts();
    } else {
      alert('Failed to delete product');
    }
  }

  function getCategoryName(id: string | null) {
    if (!id) return '—';
    return categories.find((c) => c.id === id)?.name ?? '—';
  }

  function stockBadgeClass(qty: number, threshold: number): string {
    if (qty === 0) return 'badge-red';
    if (qty <= threshold) return 'badge-yellow';
    return 'badge-green';
  }

  function stockBadgeLabel(qty: number, threshold: number): string {
    if (qty === 0) return 'Out of Stock';
    if (qty <= threshold) return `Low (${qty})`;
    return String(qty);
  }
</script>

<div class="page">
  <div class="page-header">
    <h1>Products</h1>
    <a href="/admin/products/new" class="btn-primary">+ New Product</a>
  </div>

  <!-- Low stock banners -->
  {#if outOfStockCount > 0}
    <div class="alert alert-red">
      {outOfStockCount} product{outOfStockCount > 1 ? 's' : ''} out of stock
    </div>
  {/if}
  {#if lowStockCount > 0}
    <div class="alert alert-yellow">
      {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low on stock
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters">
    <input
      type="search"
      placeholder="Search products…"
      value={search}
      oninput={handleSearch}
      class="search-input"
    />
    <select bind:value={filterCategory} onchange={handleFilter}>
      <option value="">All Categories</option>
      {#each categories as cat}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
    <select bind:value={filterStatus} onchange={handleFilter}>
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>

  {#if loading}
    <div class="loading">Loading…</div>
  {:else if products.length === 0}
    <div class="empty-state">No products found.</div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each products as product}
            <tr>
              <td class="img-cell">
                {#if product.primaryImage}
                  <img src={product.primaryImage} alt={product.title} class="thumb" />
                {:else}
                  <div class="thumb-placeholder">No img</div>
                {/if}
              </td>
              <td>
                <a href="/admin/products/{product.id}" class="product-link">{product.title}</a>
                <div class="slug-hint">{product.slug}</div>
              </td>
              <td>{getCategoryName(product.categoryId)}</td>
              <td>${Number(product.basePrice).toFixed(2)}</td>
              <td>
                <span class="badge {stockBadgeClass(product.stockQuantity, product.lowStockThreshold)}">
                  {stockBadgeLabel(product.stockQuantity, product.lowStockThreshold)}
                </span>
              </td>
              <td>
                <span class="badge {product.isActive ? 'badge-green' : 'badge-gray'}">
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="actions-cell">
                <a href="/admin/products/{product.id}" class="btn-edit">Edit</a>
                <button class="btn-delete" onclick={() => (deleteTarget = product)}>Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if pages > 1}
      <div class="pagination">
        <button onclick={prevPage} disabled={page <= 1}>← Prev</button>
        <span>Page {page} of {pages}</span>
        <button onclick={nextPage} disabled={page >= pages}>Next →</button>
      </div>
    {/if}
  {/if}
</div>

<!-- Delete confirmation -->
{#if deleteTarget}
  <div class="modal-backdrop" onclick={() => (deleteTarget = null)} onkeydown={(e) => e.key === 'Escape' && (deleteTarget = null)} role="presentation" tabindex="-1">
    <div class="modal" role="dialog" aria-modal="true" tabindex="0" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Delete Product</h2>
      </div>
      <div class="modal-body">
        <p>
          Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This cannot be
          undone.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => (deleteTarget = null)}>Cancel</button>
        <button class="btn-danger" onclick={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 1100px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .alert-red {
    background: #ffe0e0;
    color: #990000;
    border: 1px solid #ffb3b3;
  }

  .alert-yellow {
    background: #fff8e1;
    color: #7a5800;
    border: 1px solid #ffe082;
  }

  .filters {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .filters select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.875rem;
    background: #fff;
  }

  .table-container {
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid #e5e5e5;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-secondary);
  }

  td {
    padding: 0.65rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #fafafa;
  }

  .img-cell {
    width: 64px;
    padding: 0.5rem;
  }

  .thumb {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e5e5e5;
  }

  .thumb-placeholder {
    width: 48px;
    height: 48px;
    background: #f0f0f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    color: #999;
  }

  .product-link {
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    display: block;
  }

  .product-link:hover {
    color: var(--color-accent);
  }

  .slug-hint {
    font-size: 0.75rem;
    color: var(--color-secondary);
    font-family: monospace;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-green {
    background: #e6f4ea;
    color: #137333;
  }

  .badge-yellow {
    background: #fff8e1;
    color: #7a5800;
  }

  .badge-red {
    background: #ffe0e0;
    color: #990000;
  }

  .badge-gray {
    background: #f0f0f0;
    color: #666;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    background: var(--color-text);
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  .btn-primary:hover {
    opacity: 0.85;
  }

  .btn-secondary {
    background: #fff;
    color: var(--color-text);
    border: 1px solid #e0e0e0;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-secondary:hover {
    background: var(--color-surface);
  }

  .btn-edit {
    background: none;
    border: 1px solid #e0e0e0;
    padding: 0.3rem 0.6rem;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text);
    text-decoration: none;
    display: inline-block;
  }

  .btn-edit:hover {
    background: var(--color-surface);
  }

  .btn-delete {
    background: none;
    border: 1px solid #ffd0d0;
    padding: 0.3rem 0.6rem;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    color: #cc3333;
  }

  .btn-delete:hover {
    background: #ffe0e0;
  }

  .btn-danger {
    background: #cc3333;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-danger:hover {
    background: #aa2222;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--color-secondary);
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--color-secondary);
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    padding: 1rem;
  }

  .pagination button {
    background: #fff;
    border: 1px solid #e0e0e0;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .pagination button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .pagination span {
    font-size: 0.875rem;
    color: var(--color-secondary);
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: #fff;
    border-radius: 10px;
    width: 360px;
    max-width: 95vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 1.25rem 1.5rem 0;
  }

  .modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .modal-body {
    padding: 1rem 1.5rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid #f0f0f0;
  }
</style>
