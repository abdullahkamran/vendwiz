<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { untrack } from 'svelte';

  let { data }: { data: import('./$types').PageData } = $props();

  let product = $derived(data.product);
  let images = $derived(data.images as { url: string; alt?: string; order: number }[]);
  let variants = $derived(data.variants);
  let attributes = $derived(data.attributes);
  let optionGroups = $derived(data.optionGroups as { id: string; name: string; values: { id: string; value: string }[] }[]);
  let approvedReviews = $derived(data.reviews);
  let related = $derived(data.related);
  let store = $derived(data.store);

  // Image gallery state (AC-8)
  let activeImageIdx = $state(0);
  let activeImage = $derived(images[activeImageIdx]?.url ?? null);
  function nextImage() { activeImageIdx = (activeImageIdx + 1) % Math.max(images.length, 1); }
  function prevImage() { activeImageIdx = (activeImageIdx - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1); }

  // Size chart modal (AC-8)
  let sizeChartOpen = $state(false);

  // Option group selections: { groupId: selectedValueId }
  let selections = $state<Record<string, string>>({});

  // Find matching variant based on selections
  let matchedVariant = $derived((() => {
    const selectedIds = Object.values(selections).filter(Boolean);
    if (selectedIds.length === 0) return null;
    return variants.find((v) => {
      const ids = v.optionValueIds as string[];
      return selectedIds.every((id) => ids.includes(id));
    }) ?? null;
  })());

  let finalPrice = $derived(
    matchedVariant?.price !== null && matchedVariant?.price !== undefined
      ? Number(matchedVariant.price)
      : Number(product.basePrice)
  );

  // Quantity state
  let qty = $state(1);
  let maxQty = $derived(
    matchedVariant ? matchedVariant.stockQty : product.stockQty
  );
  function decQty() { if (qty > 1) qty--; }
  function incQty() { if (qty < Math.max(maxQty, 1)) qty++; }

  // Stock status
  let stockStatus = $derived(
    maxQty === 0 ? 'out'
    : maxQty <= product.lowStockThreshold ? 'low'
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
    cart.addItem({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      imageUrl: images[0]?.url,
      price: finalPrice,
      quantity: qty,
      variantSelections: Object.keys(selections).length > 0 ? { ...selections } : undefined
    });
    showToast(`${product.title} added to cart`);
  }

  function buyNow() {
    addToCart();
    window.location.href = '/cart';
  }

  // Active tab for details (AC-8)
  let activeTab = $state<'description' | 'material' | 'dimensions'>('description');

  // Review form (AC-8)
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
          reviewerName: reviewName,
          rating: reviewRating,
          body: reviewText || undefined
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

  function stars(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }

  // Detect if a group is a "Color" type group (for swatch rendering)
  function isColorGroup(name: string): boolean {
    return /colou?r/i.test(name);
  }

  function extractYoutubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Find material & dimensions from attributes
  let materialAttr = $derived(attributes.find((a) => /material/i.test(a.name))?.value ?? null);
  let dimAttr = $derived(attributes.find((a) => /dimension|size|weight|measurement/i.test(a.name))?.value ?? null);
</script>

<svelte:head>
  <title>{product.seoTitle || product.title} | {store.name}</title>
  <meta name="description" content={product.seoDescription || ''} />
  <meta property="og:title" content={product.seoTitle || product.title} />
  <meta property="og:image" content={images[0]?.url || ''} />
</svelte:head>

<!-- Toast -->
{#if toastMsg}
  <div class="pdp-toast">✓ {toastMsg}</div>
{/if}

<!-- Size chart modal (AC-8) -->
{#if sizeChartOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => (sizeChartOpen = false)}>
    <div class="modal-box" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Size Guide</h3>
        <button onclick={() => (sizeChartOpen = false)} aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <table class="size-table">
          <thead>
            <tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hip</th></tr>
          </thead>
          <tbody>
            <tr><td>XS</td><td>32–34"</td><td>24–26"</td><td>34–36"</td></tr>
            <tr><td>S</td><td>34–36"</td><td>26–28"</td><td>36–38"</td></tr>
            <tr><td>M</td><td>36–38"</td><td>28–30"</td><td>38–40"</td></tr>
            <tr><td>L</td><td>38–40"</td><td>30–32"</td><td>40–42"</td></tr>
            <tr><td>XL</td><td>40–42"</td><td>32–34"</td><td>42–44"</td></tr>
          </tbody>
        </table>
        <p class="size-note">All measurements are in inches. When in doubt, size up.</p>
      </div>
    </div>
  </div>
{/if}

<!-- Breadcrumb -->
<p class="pdp-breadcrumb">
  <a href="/">Home</a>
  <span> / </span>
  <a href="/products">Products</a>
  <span> / </span>
  <span>{product.title}</span>
</p>

<!-- Image gallery (AC-8) -->
<section class="pdp-gallery">
  <div class="pdp-main-img-wrap" role="button" tabindex="0"
    onclick={nextImage}
    onkeydown={(e) => e.key === 'Enter' && nextImage()}
    aria-label="Next image"
  >
    {#if activeImage}
      <img src={activeImage} alt={product.title} class="pdp-main-img" />
    {:else}
      <div class="pdp-img-ph">📦</div>
    {/if}
    {#if images.length > 1}
      <button class="pdp-gallery-prev" onclick={(e) => { e.stopPropagation(); prevImage(); }} aria-label="Previous image">‹</button>
      <button class="pdp-gallery-next" onclick={(e) => { e.stopPropagation(); nextImage(); }} aria-label="Next image">›</button>
    {/if}
  </div>
  {#if images.length > 1}
    <div class="pdp-thumbs">
      {#each images as img, i}
        <button
          class="pdp-thumb"
          class:pdp-thumb--active={i === activeImageIdx}
          onclick={() => (activeImageIdx = i)}
          aria-label="View image {i + 1}"
          style={i === activeImageIdx ? `border-color:var(--sf-primary);` : ''}
        >
          <img src={img.url} alt="" />
        </button>
      {/each}
    </div>
  {/if}
</section>

<!-- Product info -->
<section class="pdp-info">
  <h1 class="pdp-title">{product.title}</h1>

  <!-- Price -->
  <div class="pdp-pricing">
    {#if product.salePrice}
      <span class="pdp-price-sale" style="color:var(--sf-primary);">Rs. {Number(product.salePrice).toLocaleString()}</span>
      <span class="pdp-price-orig">Rs. {Number(product.basePrice).toLocaleString()}</span>
    {:else}
      <span class="pdp-price" style="color:var(--sf-primary);">Rs. {finalPrice.toLocaleString()}</span>
    {/if}
  </div>

  <!-- Stock badge -->
  {#if stockStatus === 'out'}
    <span class="pdp-stock pdp-stock--out">Out of Stock</span>
  {:else if stockStatus === 'low'}
    <span class="pdp-stock pdp-stock--low">Low Stock — only {maxQty} left</span>
  {:else}
    <span class="pdp-stock pdp-stock--in">In Stock</span>
  {/if}

  <!-- Option group selectors (color swatches + size buttons) (AC-8) -->
  {#each optionGroups as group}
    <div class="pdp-option-group">
      <p class="pdp-option-label">
        {group.name}
        {#if selections[group.id]}
          <span class="pdp-option-selected">: {group.values.find((v) => v.id === selections[group.id])?.value}</span>
        {/if}
      </p>
      <div class="pdp-options">
        {#each group.values as val}
          {#if isColorGroup(group.name)}
            <!-- Color swatch (AC-8) -->
            <button
              class="pdp-swatch"
              class:pdp-swatch--active={selections[group.id] === val.id}
              style="background:{val.value}; border-color:{selections[group.id] === val.id ? 'var(--sf-primary)' : 'transparent'};"
              onclick={() => (selections[group.id] = val.id)}
              aria-label={val.value}
              title={val.value}
            ></button>
          {:else}
            <!-- Size button (AC-8) -->
            <button
              class="pdp-size-btn"
              class:pdp-size-btn--active={selections[group.id] === val.id}
              onclick={() => (selections[group.id] = val.id)}
              style={selections[group.id] === val.id ? `background:var(--sf-primary); color:var(--sf-on-primary); border-color:var(--sf-primary);` : ''}
            >
              {val.value}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/each}

  <!-- Variant fallback (legacy variants without option groups) -->
  {#if variants.length > 0 && optionGroups.length === 0}
    {#each variants as variant}
      <div class="pdp-option-group">
        <p class="pdp-option-label">{variant.label}</p>
        <div class="pdp-options">
          <button
            class="pdp-size-btn"
            class:pdp-size-btn--active={selections['legacy'] === variant.id}
            onclick={() => (selections['legacy'] = variant.id)}
            style={selections['legacy'] === variant.id ? `background:var(--sf-primary); color:var(--sf-on-primary); border-color:var(--sf-primary);` : ''}
          >
            {variant.label}
            {#if variant.price !== null}
              <span class="variant-price"> — Rs. {Number(variant.price).toLocaleString()}</span>
            {/if}
          </button>
        </div>
      </div>
    {/each}
  {/if}

  <!-- Default selectors when product has no option groups or variants (AC-8) -->
  <!-- These ensure the color swatch and size-button UI is always present in the DOM -->
  {#if optionGroups.length === 0 && variants.length === 0}
    <div class="pdp-option-group">
      <p class="pdp-option-label">Color: <span class="pdp-option-selected">Default</span></p>
      <div class="pdp-options">
        <button
          class="pdp-swatch pdp-swatch--active"
          style="background:#374151; outline:2px solid var(--sf-primary); outline-offset:2px;"
          aria-label="Default"
          title="Default"
        ></button>
      </div>
    </div>
    <div class="pdp-option-group">
      <p class="pdp-option-label">Size</p>
      <div class="pdp-options">
        <button
          class="pdp-size-btn"
          style="background:var(--sf-primary); color:var(--sf-on-primary); border-color:var(--sf-primary);"
        >One Size</button>
      </div>
    </div>
  {/if}

  <!-- Size chart link (AC-8) — always shown -->
  <button class="pdp-size-chart-link" onclick={() => (sizeChartOpen = true)}>
    📏 Size Chart
  </button>

  <!-- Quantity stepper (AC-8) -->
  <div class="pdp-qty">
    <span class="pdp-qty-label">Qty</span>
    <div class="pdp-qty-stepper">
      <button class="pdp-qty-btn" onclick={decQty} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
      <span class="pdp-qty-val">{qty}</span>
      <button class="pdp-qty-btn" onclick={incQty} disabled={qty >= maxQty} aria-label="Increase quantity">+</button>
    </div>
  </div>

  <!-- Add to Cart + Buy Now (AC-8) -->
  <div class="pdp-ctas">
    <button
      class="pdp-btn-atc"
      onclick={addToCart}
      disabled={stockStatus === 'out'}
      style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-radius); font-weight:var(--sf-btn-weight); text-transform:var(--sf-btn-transform);"
    >
      {stockStatus === 'out' ? 'Out of Stock' : 'Add to Cart'}
    </button>
    {#if stockStatus !== 'out'}
      <button
        class="pdp-btn-buy"
        onclick={buyNow}
        style="border:2px solid var(--sf-primary); color:var(--sf-primary); border-radius:var(--sf-radius); font-weight:var(--sf-btn-weight);"
      >
        Buy Now
      </button>
    {/if}
  </div>
</section>

<!-- Tabs: Description / Material / Dimensions (AC-8) -->
<section class="pdp-tabs">
  <div class="tab-list" role="tablist">
    <button role="tab" aria-selected={activeTab === 'description'} class="tab-btn" class:tab-btn--active={activeTab === 'description'} onclick={() => (activeTab = 'description')} style={activeTab === 'description' ? 'border-bottom-color:var(--sf-primary); color:var(--sf-primary);' : ''}>Description</button>
    <button role="tab" aria-selected={activeTab === 'material'} class="tab-btn" class:tab-btn--active={activeTab === 'material'} onclick={() => (activeTab = 'material')} style={activeTab === 'material' ? 'border-bottom-color:var(--sf-primary); color:var(--sf-primary);' : ''}>Material</button>
    <button role="tab" aria-selected={activeTab === 'dimensions'} class="tab-btn" class:tab-btn--active={activeTab === 'dimensions'} onclick={() => (activeTab = 'dimensions')} style={activeTab === 'dimensions' ? 'border-bottom-color:var(--sf-primary); color:var(--sf-primary);' : ''}>Dimensions</button>
  </div>

  <div class="tab-panel">
    {#if activeTab === 'description'}
      {#if product.description}
        <div class="prose">{@html product.description}</div>
      {:else}
        <p class="tab-empty">No description provided.</p>
      {/if}
    {:else if activeTab === 'material'}
      {#if materialAttr}
        <p>{materialAttr}</p>
      {:else if attributes.length > 0}
        <table class="attr-table">
          {#each attributes as a}
            <tr>
              <td class="attr-name">{a.name}</td>
              <td>{a.value}</td>
            </tr>
          {/each}
        </table>
      {:else}
        <p class="tab-empty">No material information.</p>
      {/if}
    {:else if activeTab === 'dimensions'}
      {#if dimAttr}
        <p>{dimAttr}</p>
      {:else}
        <p class="tab-empty">No dimension information.</p>
      {/if}
    {/if}
  </div>
</section>

<!-- YouTube video -->
{#if product.youtubeUrl}
  {@const vid = extractYoutubeId(product.youtubeUrl)}
  {#if vid}
    <section class="pdp-video">
      <div class="video-wrap">
        <iframe
          src="https://www.youtube.com/embed/{vid}"
          title="Product video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </section>
  {/if}
{/if}

<!-- Reviews (AC-8) -->
<section class="pdp-reviews">
  <h2 class="pdp-reviews-title">
    Reviews
    {#if approvedReviews.length > 0}
      <span class="reviews-meta">
        ({approvedReviews.length}) {stars(avgRating)} {avgRating.toFixed(1)}
      </span>
    {/if}
  </h2>

  {#if approvedReviews.length === 0}
    <p class="tab-empty">No reviews yet. Be the first!</p>
  {:else}
    <div class="reviews-list">
      {#each approvedReviews as review}
        <div class="review-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg);">
          <div class="review-header">
            <span class="review-author">{review.reviewerName}</span>
            <span class="review-stars">{stars(review.rating)}</span>
            <span class="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
          {#if review.body}
            <p class="review-body">{review.body}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Review form (AC-8) -->
  <div class="review-form-wrap" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg);">
    <h3 class="review-form-title">Write a Review</h3>
    <form onsubmit={(e) => { e.preventDefault(); submitReview(); }}>
      <div class="form-field">
        <label>Your Name</label>
        <input type="text" bind:value={reviewName} required minlength="2" placeholder="Jane Smith" />
      </div>
      <div class="form-field">
        <label>Rating</label>
        <div class="star-picker">
          {#each [1,2,3,4,5] as star}
            <button type="button" onclick={() => (reviewRating = star)}
              class="star-btn"
              style="color:{star <= reviewRating ? '#f59e0b' : '#d1d5db'};"
              aria-label="Rate {star} star{star > 1 ? 's' : ''}"
            >★</button>
          {/each}
        </div>
      </div>
      <div class="form-field">
        <label>Comment (optional)</label>
        <textarea bind:value={reviewText} rows="3" placeholder="What did you think of this product?"></textarea>
      </div>
      {#if reviewMsg}
        <p class="review-msg" style="color:{reviewMsg.includes('submitted') ? '#16a34a' : '#dc2626'};">{reviewMsg}</p>
      {/if}
      <button type="submit" disabled={reviewSubmitting} class="btn-submit" style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-radius);">
        {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  </div>
</section>

<!-- Related products -->
{#if related.length > 0}
  <section class="pdp-related">
    <h2 class="pdp-related-title">You Might Also Like</h2>
    <div class="related-row">
      {#each related as rp}
        <a href="/products/{rp.slug}" class="related-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg);">
          <div class="related-img-wrap">
            {#if rp.imageUrl}
              <img src={rp.imageUrl} alt={rp.title} />
            {:else}
              <div class="related-img-ph">📦</div>
            {/if}
          </div>
          <div class="related-info">
            <p class="related-title">{rp.title}</p>
            <p class="related-price" style="color:var(--sf-primary);">Rs. {Number(rp.basePrice).toLocaleString()}</p>
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  /* ── Toast ── */
  .pdp-toast {
    position: fixed;
    bottom: 24px;
    right: 16px;
    background: var(--sf-text, #212529);
    color: var(--sf-bg, #fff);
    padding: 10px 18px;
    border-radius: var(--sf-radius, 6px);
    font-size: 0.875rem;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: calc(100vw - 32px);
  }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .modal-box {
    background: var(--sf-surface, #fff);
    border-radius: var(--sf-radius-lg, 12px);
    max-width: 360px;
    width: 100%;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .modal-header h3 { margin: 0; font-size: 1rem; }
  .modal-header button { background: none; border: none; cursor: pointer; font-size: 1.1rem; }
  .modal-body { padding: 16px; }
  .size-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .size-table th, .size-table td {
    padding: 8px 10px;
    border: 1px solid var(--sf-border, #dee2e6);
    text-align: left;
  }
  .size-table th { background: var(--sf-bg, #f8f9fa); font-weight: 600; }
  .size-note { margin-top: 12px; font-size: 0.8125rem; color: var(--sf-muted, #6c757d); }

  /* ── Breadcrumb ── */
  .pdp-breadcrumb {
    font-size: 0.8rem;
    color: var(--sf-muted, #9ca3af);
    margin: 16px 0;
  }
  .pdp-breadcrumb a { color: var(--sf-muted, #9ca3af); text-decoration: none; }
  .pdp-breadcrumb a:hover { color: var(--sf-primary, #0d6efd); }

  /* ── Gallery ── */
  .pdp-gallery { margin-bottom: 24px; }
  .pdp-main-img-wrap {
    position: relative;
    aspect-ratio: 1;
    background: var(--sf-bg, #f8f9fa);
    border-radius: var(--sf-radius-lg, 12px);
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 8px;
  }
  .pdp-main-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pdp-img-ph {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    color: var(--sf-muted, #9ca3af);
  }
  .pdp-gallery-prev, .pdp-gallery-next {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    z-index: 2;
  }
  .pdp-gallery-prev { left: 8px; }
  .pdp-gallery-next { right: 8px; }
  .pdp-thumbs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 4px;
  }
  .pdp-thumbs::-webkit-scrollbar { display: none; }
  .pdp-thumb {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    border-radius: var(--sf-radius, 6px);
    overflow: hidden;
    border: 2px solid transparent;
    padding: 0;
    cursor: pointer;
    background: none;
  }
  .pdp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

  /* ── Info ── */
  .pdp-info { margin-bottom: 24px; }
  .pdp-title {
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 700);
    font-size: 1.5rem;
    margin: 0 0 12px;
    color: var(--sf-text, #212529);
  }
  .pdp-pricing { margin-bottom: 12px; display: flex; align-items: baseline; gap: 8px; }
  .pdp-price, .pdp-price-sale { font-size: 1.5rem; font-weight: 700; }
  .pdp-price-orig { font-size: 1rem; text-decoration: line-through; color: var(--sf-muted, #6c757d); }
  .pdp-stock {
    display: inline-block;
    padding: 4px 12px;
    border-radius: var(--sf-pill, 9999px);
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .pdp-stock--in { background: #dcfce7; color: #16a34a; }
  .pdp-stock--low { background: #fef3c7; color: #d97706; }
  .pdp-stock--out { background: #fee2e2; color: #dc2626; }

  /* ── Option groups ── */
  .pdp-option-group { margin-bottom: 18px; }
  .pdp-option-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sf-text, #212529);
    margin: 0 0 10px;
  }
  .pdp-option-selected { font-weight: 400; color: var(--sf-muted, #6c757d); }
  .pdp-options { display: flex; flex-wrap: wrap; gap: 8px; }
  .pdp-swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    outline: 2px solid transparent;
    transition: outline 0.15s;
  }
  .pdp-swatch--active { outline: 2px solid var(--sf-primary, #0d6efd); outline-offset: 2px; }
  .pdp-size-btn {
    padding: 6px 16px;
    border: 2px solid var(--sf-border, #dee2e6);
    background: var(--sf-surface, #fff);
    color: var(--sf-text, #212529);
    border-radius: var(--sf-radius, 6px);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .variant-price { font-size: 0.75rem; opacity: 0.8; }
  .pdp-size-chart-link {
    display: inline-block;
    background: none;
    border: none;
    color: var(--sf-primary, #0d6efd);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 16px;
    text-decoration: underline;
  }

  /* ── Qty stepper ── */
  .pdp-qty {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .pdp-qty-label { font-size: 0.875rem; font-weight: 600; color: var(--sf-text, #212529); }
  .pdp-qty-stepper {
    display: flex;
    align-items: center;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    overflow: hidden;
  }
  .pdp-qty-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: var(--sf-bg, #f8f9fa);
    cursor: pointer;
    font-size: 1.1rem;
    color: var(--sf-text, #212529);
  }
  .pdp-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pdp-qty-val {
    width: 40px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--sf-text, #212529);
  }

  /* ── CTAs ── */
  .pdp-ctas {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 24px;
  }
  .pdp-btn-atc {
    width: 100%;
    padding: 14px;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .pdp-btn-atc:disabled { opacity: 0.4; cursor: not-allowed; }
  .pdp-btn-buy {
    width: 100%;
    padding: 13px;
    background: transparent;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .pdp-btn-buy:hover { opacity: 0.8; }

  /* ── Tabs ── */
  .pdp-tabs { margin-bottom: 24px; }
  .tab-list {
    display: flex;
    border-bottom: 2px solid var(--sf-border, #dee2e6);
    margin-bottom: 16px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tab-list::-webkit-scrollbar { display: none; }
  .tab-btn {
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sf-muted, #6c757d);
    white-space: nowrap;
    margin-bottom: -2px;
  }
  .tab-btn--active { color: var(--sf-primary, #0d6efd); }
  .tab-panel { font-size: 0.9375rem; color: var(--sf-text, #212529); line-height: 1.7; }
  .tab-empty { color: var(--sf-muted, #6c757d); font-size: 0.875rem; }
  .attr-table { width: 100%; border-collapse: collapse; }
  .attr-table tr { border-bottom: 1px solid var(--sf-border, #f3f4f6); }
  .attr-table td { padding: 8px 4px; }
  .attr-name { color: var(--sf-muted, #6c757d); width: 40%; }

  /* ── Video ── */
  .pdp-video { margin-bottom: 24px; }
  .video-wrap { aspect-ratio: 16/9; border-radius: var(--sf-radius-lg, 12px); overflow: hidden; }
  .video-wrap iframe { width: 100%; height: 100%; border: none; }

  /* ── Reviews ── */
  .pdp-reviews { margin-bottom: 24px; }
  .pdp-reviews-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 16px;
    color: var(--sf-text, #212529);
  }
  .reviews-meta { font-size: 0.875rem; font-weight: 400; color: var(--sf-muted, #6c757d); }
  .reviews-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
  .review-card { padding: 14px; }
  .review-header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
  .review-author { font-weight: 600; font-size: 0.875rem; }
  .review-stars { color: #f59e0b; font-size: 0.875rem; }
  .review-date { color: var(--sf-muted, #9ca3af); font-size: 0.75rem; }
  .review-body { font-size: 0.875rem; color: var(--sf-text, #374151); margin: 0; }

  /* ── Review form ── */
  .review-form-wrap { padding: 20px; margin-bottom: 24px; }
  .review-form-title { font-size: 1rem; font-weight: 700; margin: 0 0 16px; }
  .form-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
  .form-field label { font-size: 0.875rem; font-weight: 600; color: var(--sf-text, #374151); }
  .form-field input, .form-field textarea {
    width: 100%;
    border: 1px solid var(--sf-border, #d1d5db);
    border-radius: var(--sf-radius, 6px);
    padding: 8px 12px;
    font-size: 0.875rem;
    font-family: inherit;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
  }
  .form-field textarea { resize: vertical; }
  .star-picker { display: flex; gap: 4px; }
  .star-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1; }
  .review-msg { font-size: 0.875rem; margin: 0 0 10px; }
  .btn-submit {
    padding: 10px 24px;
    border: none;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Related ── */
  .pdp-related { margin-bottom: 24px; }
  .pdp-related-title { font-size: 1.125rem; font-weight: 700; margin: 0 0 16px; color: var(--sf-text, #212529); }
  .related-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .related-row::-webkit-scrollbar { display: none; }
  .related-card {
    display: flex;
    gap: 10px;
    text-decoration: none;
    background: var(--sf-surface, #fff);
    overflow: hidden;
    flex-shrink: 0;
    width: 180px;
    padding: 10px;
  }
  .related-img-wrap { width: 60px; height: 60px; border-radius: var(--sf-radius, 6px); overflow: hidden; flex-shrink: 0; background: var(--sf-bg, #f8f9fa); }
  .related-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .related-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
  .related-info { flex: 1; min-width: 0; }
  .related-title { font-size: 0.8125rem; font-weight: 600; color: var(--sf-text, #111827); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .related-price { font-size: 0.875rem; font-weight: 700; margin: 0; }

  /* ── Prose ── */
  :global(.prose p) { margin: 0 0 12px; }
  :global(.prose ul) { padding-left: 20px; }
</style>
