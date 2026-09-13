<script lang="ts">
  let { data }: { data: import('./$types').PageData } = $props();

  let store = $derived(data.store);
  let featured = $derived(data.featured);
</script>

<svelte:head>
  <title>{store.name}</title>
  <meta name="description" content="Shop at {store.name}" />
</svelte:head>

<!-- Hero -->
<section style="background:var(--store-primary,#111827); color:#fff; padding:80px 24px; text-align:center;">
  <h1 style="font-size:2.5rem; font-weight:800; margin:0 0 16px;">{store.name}</h1>
  <p style="font-size:1.125rem; opacity:0.85; margin:0 0 32px;">Discover our latest collection</p>
  <a
    href="/products"
    style="display:inline-block; padding:12px 32px; background:#fff; color:var(--store-primary,#111827); font-weight:700; border-radius:8px; text-decoration:none; font-size:1rem;"
  >
    Shop Now
  </a>
</section>

<!-- Featured products -->
<section style="max-width:1280px; margin:64px auto; padding:0 24px;">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:32px;">
    <h2 style="font-size:1.5rem; font-weight:700; margin:0;">Featured Products</h2>
    <a href="/products" style="color:var(--store-primary,#111827); text-decoration:none; font-size:0.875rem; font-weight:600;">
      View All →
    </a>
  </div>

  {#if featured.length === 0}
    <p style="color:#6b7280; text-align:center; padding:64px 0;">No products yet. Check back soon!</p>
  {:else}
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:24px;">
      {#each featured as product}
        <a
          href="/products/{product.slug}"
          style="display:block; text-decoration:none; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;"
        >
          <!-- Product image -->
          <div style="aspect-ratio:1; background:#f3f4f6; overflow:hidden;">
            {#if product.imageUrl}
              <img
                src={product.imageUrl}
                alt={product.title}
                style="width:100%; height:100%; object-fit:cover;"
              />
            {:else}
              <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:2rem;">
                📦
              </div>
            {/if}
          </div>

          <!-- Product info -->
          <div style="padding:16px;">
            <h3 style="font-size:0.95rem; font-weight:600; color:#111827; margin:0 0 8px;">{product.title}</h3>
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:1rem; font-weight:700; color:var(--store-primary,#111827);">
                Rs. {Number(product.basePrice).toLocaleString()}
              </span>
              {#if product.stockQuantity === 0}
                <span style="font-size:0.7rem; background:#fee2e2; color:#dc2626; padding:2px 8px; border-radius:20px;">Out of Stock</span>
              {/if}
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
