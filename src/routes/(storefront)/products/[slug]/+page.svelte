<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import type { VariantOption } from '$lib/db/schema';

  let { data }: { data: import('./$types').PageData } = $props();

  let product = $derived(data.product);
  let images = $derived(data.images);
  let variants = $derived(data.variants);
  let attributes = $derived(data.attributes);
  let approvedReviews = $derived(data.reviews);
  let related = $derived(data.related);
  let store = $derived(data.store);

  // Image carousel state
  let activeImageIdx = $state(0);
  let activeImage = $derived(images[activeImageIdx]?.url ?? null);

  // Variant selection state: { variantId: selectedOptionLabel }
  let variantSelections = $state<Record<string, string>>({});

  // Compute price modifier from selections
  let priceModifier = $derived(
    variants.reduce((total: number, variant) => {
      const selectedLabel = variantSelections[variant.id];
      if (!selectedLabel) return total;
      const opts = variant.options as VariantOption[];
      const opt = opts.find((o) => o.label === selectedLabel);
      return total + (opt?.price_modifier ?? 0);
    }, 0)
  );

  let finalPrice = $derived(Number(product.basePrice) + priceModifier);

  // Quantity state
  let qty = $state(1);
  let maxQty = $derived(product.stockQuantity);
  function decQty() { if (qty > 1) qty--; }
  function incQty() { if (qty < maxQty) qty++; }

  // Stock badge
  let stockStatus = $derived(
    product.stockQuantity === 0 ? 'out'
    : product.stockQuantity <= product.lowStockThreshold ? 'low'
    : 'in'
  );

  // Toast
  let toastMsg = $state('');
  let toastTimeout: ReturnType<typeof setTimeout>;
  function showToast(msg: string) {
    clearTimeout(toastTimeout);
    toastMsg = msg;
    toastTimeout = setTimeout(() => (toastMsg = ''), 3000);
  }

  function addToCart() {
    const selByName: Record<string, string> = {};
    for (const v of variants) {
      const selected = variantSelections[v.id];
      if (selected) selByName[v.name] = selected;
    }
    cart.addItem({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      imageUrl: images[0]?.url,
      price: finalPrice,
      quantity: qty,
      variantSelections: Object.keys(selByName).length > 0 ? selByName : undefined
    });
    showToast(`${product.title} added to cart`);
  }

  // Review form
  let reviewName = $state('');
  let reviewRating = $state(5);
  let reviewText = $state('');
  let reviewSubmitting = $state(false);
  let reviewMsg = $state('');

  async function submitReview() {
    reviewSubmitting = true;
    reviewMsg = '';
    try {
      const res = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerName: reviewName,
          rating: reviewRating,
          text: reviewText || undefined
        })
      });
      if (res.ok) {
        reviewMsg = 'Review submitted! It will appear after approval.';
        reviewName = '';
        reviewRating = 5;
        reviewText = '';
      } else {
        const err = await res.json().catch(() => ({}));
        reviewMsg = (err as { error?: string }).error ?? 'Submission failed. Please try again.';
      }
    } finally {
      reviewSubmitting = false;
    }
  }

  let avgRating = $derived(
    approvedReviews.length > 0
      ? approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length
      : 0
  );

  function extractYoutubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
</script>

<svelte:head>
  <title>{product.metaTitle || product.title} | {store.name}</title>
  <meta name="description" content={product.metaDescription || ''} />
  <meta property="og:title" content={product.metaTitle || product.title} />
  <meta property="og:image" content={images[0]?.url || ''} />
</svelte:head>

<!-- Toast -->
{#if toastMsg}
  <div style="position:fixed; bottom:24px; right:24px; background:#111827; color:#fff; padding:12px 20px; border-radius:8px; font-size:0.875rem; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
    ✓ {toastMsg}
  </div>
{/if}

<div style="max-width:1280px; margin:0 auto; padding:32px 24px;">
  <!-- Breadcrumb -->
  <p style="font-size:0.8rem; color:#9ca3af; margin-bottom:24px;">
    <a href="/" style="color:#9ca3af; text-decoration:none;">Home</a>
    <span style="margin:0 6px;">/</span>
    <a href="/products" style="color:#9ca3af; text-decoration:none;">Products</a>
    <span style="margin:0 6px;">/</span>
    <span style="color:#374151;">{product.title}</span>
  </p>

  <!-- Product layout -->
  <div class="pdp-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:start;">
    <!-- Left: images -->
    <div>
      <!-- Main image -->
      <div style="aspect-ratio:1; background:#f3f4f6; border-radius:12px; overflow:hidden; margin-bottom:12px;">
        {#if activeImage}
          <img src={activeImage} alt={product.title} style="width:100%; height:100%; object-fit:cover;" />
        {:else}
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:4rem; color:#d1d5db;">📦</div>
        {/if}
      </div>

      <!-- Thumbnails -->
      {#if images.length > 1}
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          {#each images as img, i}
            <button onclick={() => (activeImageIdx = i)}
              style="width:64px; height:64px; border-radius:8px; overflow:hidden; border:2px solid {i === activeImageIdx ? 'var(--store-primary,#111827)' : '#e5e7eb'}; padding:0; cursor:pointer; background:none;">
              <img src={img.url} alt="" style="width:100%; height:100%; object-fit:cover;" />
            </button>
          {/each}
        </div>
      {/if}

      <!-- YouTube embed -->
      {#if product.youtubeUrl}
        {@const vid = extractYoutubeId(product.youtubeUrl)}
        {#if vid}
          <div style="margin-top:24px; border-radius:12px; overflow:hidden; aspect-ratio:16/9;">
            <iframe
              src="https://www.youtube.com/embed/{vid}"
              title="Product video"
              style="width:100%; height:100%; border:none;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Right: info -->
    <div>
      <h1 style="font-size:1.75rem; font-weight:800; color:#111827; margin:0 0 12px;">{product.title}</h1>

      <!-- Price -->
      <p style="font-size:1.75rem; font-weight:700; color:var(--store-primary,#111827); margin:0 0 16px;">
        Rs. {finalPrice.toLocaleString()}
      </p>

      <!-- Stock badge -->
      {#if stockStatus === 'out'}
        <span style="display:inline-block; background:#fee2e2; color:#dc2626; padding:4px 14px; border-radius:20px; font-size:0.8rem; font-weight:600; margin-bottom:16px;">Out of Stock</span>
      {:else if stockStatus === 'low'}
        <span style="display:inline-block; background:#fef3c7; color:#d97706; padding:4px 14px; border-radius:20px; font-size:0.8rem; font-weight:600; margin-bottom:16px;">Low Stock — only {product.stockQuantity} left</span>
      {:else}
        <span style="display:inline-block; background:#dcfce7; color:#16a34a; padding:4px 14px; border-radius:20px; font-size:0.8rem; font-weight:600; margin-bottom:16px;">In Stock</span>
      {/if}

      <!-- Variant selectors -->
      {#each variants as variant}
        {@const opts = variant.options as VariantOption[]}
        <div style="margin-bottom:20px;">
          <p style="font-size:0.875rem; font-weight:600; color:#374151; margin:0 0 10px;">
            {variant.name}
            {#if variantSelections[variant.id]}
              <span style="font-weight:400; color:#6b7280;">: {variantSelections[variant.id]}</span>
            {/if}
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            {#each opts as opt}
              <button
                onclick={() => (variantSelections[variant.id] = opt.label)}
                style="padding:6px 16px; border:2px solid {variantSelections[variant.id] === opt.label ? 'var(--store-primary,#111827)' : '#e5e7eb'}; background:{variantSelections[variant.id] === opt.label ? 'var(--store-primary,#111827)' : '#fff'}; color:{variantSelections[variant.id] === opt.label ? '#fff' : '#374151'}; border-radius:8px; font-size:0.875rem; cursor:pointer;"
              >
                {opt.label}
                {#if opt.price_modifier !== 0}
                  <span style="font-size:0.75rem; opacity:0.8;">({opt.price_modifier > 0 ? '+' : ''}Rs.{opt.price_modifier})</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}

      <!-- Quantity picker -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
        <span style="font-size:0.875rem; font-weight:600; color:#374151;">Qty:</span>
        <div style="display:flex; align-items:center; border:1px solid #d1d5db; border-radius:8px; overflow:hidden;">
          <button onclick={decQty} disabled={qty <= 1}
            style="width:36px; height:36px; border:none; background:#f9fafb; cursor:pointer; font-size:1.1rem; color:#374151;">−</button>
          <span style="width:40px; text-align:center; font-size:0.9rem; font-weight:600;">{qty}</span>
          <button onclick={incQty} disabled={qty >= maxQty}
            style="width:36px; height:36px; border:none; background:#f9fafb; cursor:pointer; font-size:1.1rem; color:#374151;">+</button>
        </div>
      </div>

      <!-- Add to cart -->
      <button
        onclick={addToCart}
        disabled={stockStatus === 'out'}
        style="width:100%; padding:14px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:10px; font-size:1rem; font-weight:700; cursor:pointer;"
      >
        {stockStatus === 'out' ? 'Out of Stock' : 'Add to Cart'}
      </button>

      <a href="/cart" style="display:block; text-align:center; margin-top:12px; color:#6b7280; font-size:0.875rem; text-decoration:none;">View Cart →</a>
    </div>
  </div>

  <!-- Below fold -->
  <div class="pdp-below" style="margin-top:64px; display:grid; grid-template-columns:2fr 1fr; gap:48px;">
    <div>
      <!-- Description -->
      {#if product.description}
        <section style="margin-bottom:48px;">
          <h2 style="font-size:1.25rem; font-weight:700; margin-bottom:16px;">Description</h2>
          <div class="prose" style="color:#374151; line-height:1.7;">{@html product.description}</div>
        </section>
      {/if}

      <!-- Attributes -->
      {#if attributes.length > 0}
        <section style="margin-bottom:48px;">
          <h2 style="font-size:1.25rem; font-weight:700; margin-bottom:16px;">Specifications</h2>
          <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            {#each attributes as attr}
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 16px 10px 0; color:#6b7280; width:40%;">{attr.name}</td>
                <td style="padding:10px 0; color:#111827; font-weight:500;">{attr.value}</td>
              </tr>
            {/each}
          </table>
        </section>
      {/if}

      <!-- Reviews -->
      <section>
        <h2 style="font-size:1.25rem; font-weight:700; margin-bottom:16px;">
          Reviews
          {#if approvedReviews.length > 0}
            <span style="font-size:0.9rem; color:#6b7280; font-weight:400;">
              ({approvedReviews.length}) — {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))} {avgRating.toFixed(1)}
            </span>
          {/if}
        </h2>

        {#if approvedReviews.length === 0}
          <p style="color:#9ca3af; font-size:0.9rem;">No reviews yet. Be the first!</p>
        {:else}
          <div style="display:flex; flex-direction:column; gap:20px; margin-bottom:32px;">
            {#each approvedReviews as review}
              <div style="border:1px solid #f3f4f6; border-radius:10px; padding:16px;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                  <span style="font-weight:600; font-size:0.9rem;">{review.customerName}</span>
                  <span style="color:#f59e0b; font-size:0.9rem;">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  <span style="color:#9ca3af; font-size:0.75rem;">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {#if review.text}
                  <p style="color:#374151; font-size:0.875rem; margin:0;">{review.text}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Write a review -->
        <div style="border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
          <h3 style="font-size:1rem; font-weight:700; margin:0 0 20px;">Write a Review</h3>
          <form onsubmit={(e) => { e.preventDefault(); submitReview(); }}>
            <div style="margin-bottom:16px;">
              <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Your Name</label>
              <input bind:value={reviewName} required minlength="2"
                style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:0.875rem; box-sizing:border-box;" />
            </div>
            <div style="margin-bottom:16px;">
              <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Rating</label>
              <div style="display:flex; gap:8px;">
                {#each [1, 2, 3, 4, 5] as star}
                  <button type="button" onclick={() => (reviewRating = star)}
                    style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:{star <= reviewRating ? '#f59e0b' : '#d1d5db'};">★</button>
                {/each}
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Comment (optional)</label>
              <textarea bind:value={reviewText} rows="3"
                style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:0.875rem; resize:vertical; box-sizing:border-box;"></textarea>
            </div>
            {#if reviewMsg}
              <p style="font-size:0.875rem; color:{reviewMsg.includes('submitted') ? '#16a34a' : '#dc2626'}; margin:0 0 12px;">{reviewMsg}</p>
            {/if}
            <button type="submit" disabled={reviewSubmitting}
              style="padding:10px 24px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer;">
              {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>
      </section>
    </div>

    <!-- Related products sidebar -->
    {#if related.length > 0}
      <div>
        <h2 style="font-size:1.1rem; font-weight:700; margin-bottom:16px;">You Might Also Like</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          {#each related as rp}
            <a href="/products/{rp.slug}" style="display:flex; gap:12px; text-decoration:none;">
              <div style="width:72px; height:72px; flex-shrink:0; border-radius:8px; overflow:hidden; background:#f3f4f6;">
                {#if rp.imageUrl}
                  <img src={rp.imageUrl} alt={rp.title} style="width:100%; height:100%; object-fit:cover;" />
                {:else}
                  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#d1d5db;">📦</div>
                {/if}
              </div>
              <div>
                <p style="font-size:0.875rem; font-weight:600; color:#111827; margin:0 0 4px;">{rp.title}</p>
                <p style="font-size:0.9rem; font-weight:700; color:var(--store-primary,#111827); margin:0;">Rs. {Number(rp.basePrice).toLocaleString()}</p>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @media (max-width: 768px) {
    :global(.pdp-grid) { grid-template-columns: 1fr !important; }
    :global(.pdp-below) { grid-template-columns: 1fr !important; }
  }
</style>
