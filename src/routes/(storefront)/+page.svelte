<script lang="ts">
  import { onMount } from 'svelte';

  let { data }: { data: import('./$types').PageData } = $props();

  let store = $derived(data.store);
  let featured = $derived(data.featured);
  let categories = $derived(data.categories ?? []);
  let promoCode = $derived(data.promoCode ?? null);

  // ── Slideshow hero (AC-5): auto-advances every 4s ──────────────────────────
  const heroSlides = $derived(
    featured.slice(0, 4).map((p) => ({
      title: p.title,
      imageUrl: p.imageUrl,
      slug: p.slug
    }))
  );
  // Fall back to a single generic slide if no products
  let slides = $derived(
    heroSlides.length > 0
      ? heroSlides
      : [{ title: store.name, imageUrl: null as string | null, slug: null as string | null }]
  );
  let activeSlide = $state(0);
  let slideInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    slideInterval = setInterval(() => {
      activeSlide = (activeSlide + 1) % slides.length;
    }, 4000);
    return () => clearInterval(slideInterval);
  });

  function goToSlide(i: number) {
    activeSlide = i;
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
      activeSlide = (activeSlide + 1) % slides.length;
    }, 4000);
  }

  // Theme-based card layout
  let cardLayout = $derived(
    store.theme === 'minimal' ? 'editorial'
    : store.theme === 'bold' ? 'overlay'
    : store.theme === 'playful' ? 'horizontal'
    : 'vertical'
  );
</script>

<svelte:head>
  <title>{store.name}</title>
  <meta name="description" content={store.description ?? `Shop at ${store.name}`} />
</svelte:head>

<!-- ── Slideshow Hero ──────────────────────────────────────────────────────── -->
<section class="sf-hero" style="background:var(--sf-primary); color:var(--sf-on-primary);">
  <div class="sf-hero-slides">
    {#each slides as slide, i}
      <div
        class="sf-hero-slide"
        class:sf-hero-slide--active={i === activeSlide}
        aria-hidden={i !== activeSlide}
      >
        {#if slide.imageUrl}
          <img src={slide.imageUrl} alt={slide.title} class="sf-hero-bg" />
          <div class="sf-hero-overlay"></div>
        {/if}
        <div class="sf-hero-content">
          {#if i === 0}
            <h1 class="sf-hero-title">{store.name}</h1>
            <p class="sf-hero-sub">Discover our latest collection</p>
          {:else}
            <h2 class="sf-hero-title">{slide.title}</h2>
          {/if}
          {#if slide.slug}
            <a href="/products/{slide.slug}" class="sf-hero-cta">Shop Now</a>
          {:else}
            <a href="/products" class="sf-hero-cta">Shop Now</a>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Dot navigation — always rendered so controls are present even with a single slide -->
  <div class="sf-hero-dots" role="tablist" aria-label="Slideshow navigation">
    {#each slides as _, i}
      <button
        role="tab"
        aria-selected={i === activeSlide}
        aria-label="Go to slide {i + 1}"
        class="sf-hero-dot"
        class:sf-hero-dot--active={i === activeSlide}
        onclick={() => goToSlide(i)}
      ></button>
    {/each}
  </div>
</section>

<!-- ── Promo / Discount Code Banner (AC-5) — always rendered ─────────────── -->
<div class="sf-promo-banner" style="background:var(--sf-surface); border:var(--sf-card-border); border-radius:var(--sf-radius);">
  {#if promoCode}
    <span class="sf-promo-text">
      🎉 Use code <strong class="sf-promo-code">{promoCode.code}</strong>
      for {promoCode.type === 'percentage' ? `${promoCode.value}% off` : `Rs. ${promoCode.value} off`}
    </span>
  {:else}
    <span class="sf-promo-text">🛍️ Welcome to {store.name} — browse our latest arrivals!</span>
  {/if}
</div>

<!-- ── 3-Column Category Grid (AC-5) — always rendered ───────────────────── -->
<section class="sf-section">
  <h2 class="sf-section-title">Shop by Category</h2>
  <div class="sf-cat-grid">
    {#if categories.length > 0}
      {#each categories as cat}
        <a href="/products?category={cat.id}" class="sf-cat-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);">
          {#if cat.imageUrl}
            <img src={cat.imageUrl} alt={cat.name} class="sf-cat-img" />
          {:else}
            <div class="sf-cat-placeholder">🏷️</div>
          {/if}
          <span class="sf-cat-name">{cat.name}</span>
        </a>
      {/each}
    {:else}
      <!-- Placeholder grid when no categories have been created yet -->
      {#each ['All Products', 'New Arrivals', 'Sale'] as label}
        <a href="/products" class="sf-cat-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);">
          <div class="sf-cat-placeholder">🏷️</div>
          <span class="sf-cat-name">{label}</span>
        </a>
      {/each}
    {/if}
  </div>
</section>

<!-- ── New Arrivals — horizontal scroll row (AC-5) ────────────────────────── -->
{#if featured.length > 0}
  <section class="sf-section">
    <div class="sf-section-header">
      <h2 class="sf-section-title">New Arrivals</h2>
      <a href="/products" class="sf-section-link">View All →</a>
    </div>

    <div class="sf-arrivals-row">
      {#each featured as product}
        <a
          href="/products/{product.slug}"
          class="sf-product-card sf-product-card--{cardLayout}"
          style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);"
        >
          <div class="sf-card-img-wrap">
            {#if product.imageUrl}
              <img src={product.imageUrl} alt={product.title} class="sf-card-img" />
            {:else}
              <div class="sf-card-img-placeholder">📦</div>
            {/if}
          </div>
          <div class="sf-card-info">
            <p class="sf-card-title">{product.title}</p>
            <p class="sf-card-price" style="color:var(--sf-primary);">Rs. {Number(product.basePrice).toLocaleString()}</p>
            {#if product.stockQty === 0}
              <span class="sf-badge-oos">Out of Stock</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </section>
{:else}
  <section class="sf-section sf-empty">
    <p>No products yet. Check back soon!</p>
  </section>
{/if}

<style>
  /* ── Hero ── */
  .sf-hero {
    position: relative;
    overflow: hidden;
    min-height: 260px;
  }
  .sf-hero-slides {
    position: relative;
    min-height: 260px;
  }
  .sf-hero-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
  }
  .sf-hero-slide--active {
    opacity: 1;
    pointer-events: auto;
    position: relative;
    min-height: 260px;
  }
  .sf-hero-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .sf-hero-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }
  .sf-hero-content {
    position: relative;
    z-index: 2;
    text-align: center;
    padding: 48px 24px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .sf-hero-title {
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 700);
    font-size: 1.75rem;
    letter-spacing: var(--sf-letter-spacing, 0);
    margin: 0;
    text-transform: var(--sf-btn-transform, none);
  }
  .sf-hero-sub {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0;
  }
  .sf-hero-cta {
    display: inline-block;
    padding: 10px 28px;
    background: var(--sf-on-primary, #fff);
    color: var(--sf-primary, #0d6efd);
    font-weight: var(--sf-btn-weight, 600);
    border-radius: var(--sf-pill, 9999px);
    text-decoration: none;
    font-size: 0.9375rem;
    text-transform: var(--sf-btn-transform, none);
    transition: opacity 0.2s;
  }
  .sf-hero-cta:hover { opacity: 0.85; }
  .sf-hero-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 12px 0 8px;
    position: relative;
    z-index: 3;
    background: var(--sf-primary, #0d6efd);
  }
  .sf-hero-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  .sf-hero-dot--active {
    background: #fff;
  }

  /* ── Promo banner ── */
  .sf-promo-banner {
    margin: 16px 0;
    padding: 14px 16px;
    text-align: center;
    font-size: 0.9375rem;
    color: var(--sf-text, #212529);
  }
  .sf-promo-code {
    color: var(--sf-primary, #0d6efd);
    font-family: monospace;
    font-size: 1rem;
  }

  /* ── Sections ── */
  .sf-section {
    padding: 24px 0;
  }
  .sf-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .sf-section-title {
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 700);
    font-size: 1.125rem;
    margin: 0 0 16px;
    color: var(--sf-text, #212529);
    letter-spacing: var(--sf-letter-spacing, 0);
  }
  .sf-section-link {
    font-size: 0.8125rem;
    color: var(--sf-primary, #0d6efd);
    text-decoration: none;
    font-weight: 600;
  }
  .sf-empty {
    text-align: center;
    padding: 48px 0;
    color: var(--sf-muted, #6c757d);
  }

  /* ── Category grid: 3 columns ── */
  .sf-cat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .sf-cat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    text-decoration: none;
    color: var(--sf-text, #212529);
    background: var(--sf-surface, #fff);
    overflow: hidden;
    transition: opacity 0.2s;
    gap: 8px;
  }
  .sf-cat-card:hover { opacity: 0.85; }
  .sf-cat-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--sf-radius, 6px);
  }
  .sf-cat-placeholder {
    font-size: 2rem;
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sf-bg, #f8f9fa);
    border-radius: var(--sf-radius, 6px);
  }
  .sf-cat-name {
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: center;
  }

  /* ── New arrivals: horizontal scroll row ── */
  .sf-arrivals-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 8px;
  }
  .sf-arrivals-row::-webkit-scrollbar { display: none; }

  /* ── Product card variants (AC-7) ── */
  .sf-product-card {
    text-decoration: none;
    color: var(--sf-text, #212529);
    background: var(--sf-surface, #fff);
    overflow: hidden;
    flex-shrink: 0;
    transition: box-shadow 0.2s;
  }
  .sf-product-card:hover { opacity: 0.9; }

  /* vertical (basic) */
  .sf-product-card--vertical {
    width: 160px;
    display: flex;
    flex-direction: column;
  }
  .sf-product-card--vertical .sf-card-img-wrap { aspect-ratio: 1; width: 100%; }
  .sf-product-card--vertical .sf-card-info { padding: 10px; }

  /* editorial (minimal) */
  .sf-product-card--editorial {
    width: 200px;
    display: flex;
    flex-direction: column;
  }
  .sf-product-card--editorial .sf-card-img-wrap { aspect-ratio: 3/4; width: 100%; }
  .sf-product-card--editorial .sf-card-info { padding: 12px; }
  .sf-product-card--editorial .sf-card-title {
    font-family: var(--sf-heading-font, serif);
    font-weight: var(--sf-heading-weight, 800);
    font-size: 0.875rem;
  }

  /* overlay (bold) */
  .sf-product-card--overlay {
    width: 180px;
    position: relative;
    display: block;
  }
  .sf-product-card--overlay .sf-card-img-wrap { aspect-ratio: 1; width: 100%; }
  .sf-product-card--overlay .sf-card-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.75));
    color: #fff;
  }
  .sf-product-card--overlay .sf-card-price { color: #fff !important; }

  /* horizontal-row (playful) */
  .sf-product-card--horizontal {
    width: 260px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .sf-product-card--horizontal .sf-card-img-wrap {
    width: 90px;
    height: 90px;
    flex-shrink: 0;
  }
  .sf-product-card--horizontal .sf-card-info { padding: 10px 12px; flex: 1; }

  .sf-card-img-wrap {
    overflow: hidden;
    background: var(--sf-bg, #f8f9fa);
  }
  .sf-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .sf-card-img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--sf-muted, #6c757d);
  }
  .sf-card-title {
    font-size: 0.8125rem;
    font-weight: 600;
    margin: 0 0 4px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .sf-card-price {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
  }
  .sf-badge-oos {
    font-size: 0.65rem;
    background: #fee2e2;
    color: #dc2626;
    padding: 2px 6px;
    border-radius: var(--sf-pill, 9999px);
    display: inline-block;
    margin-top: 4px;
  }
</style>
