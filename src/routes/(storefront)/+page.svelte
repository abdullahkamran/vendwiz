<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Seo from '$lib/components/storefront/Seo.svelte';
  import { websiteJsonLd } from '$lib/seo';
  import { buildCategoryTree } from '$lib/utils/category-tree';
  import ProductMedia from '$lib/components/storefront/ProductMedia.svelte';

  let { data }: { data: import('./$types').PageData } = $props();

  let store = $derived(data.store);
  let featured = $derived(data.featured);
  let categories = $derived(data.categories ?? []);
  let basePath = $derived(data.basePath ?? '');

  // Build tree for the category grid; slice to 6 parent nodes
  let categoryTree = $derived(buildCategoryTree(categories).slice(0, 6));

  // ── Slideshow hero (AC-5): auto-advances every 4s ──────────────────────────
  // The owner's own slides (Settings → Announcement) when set; otherwise the latest
  // products, with the store name on the first slide.
  type Slide = { title: string; description: string; imageUrl: string | null };
  const ownSlides = $derived<Slide[]>(
    (store.heroSlides ?? []).map((s) => ({ title: s.title, description: s.description, imageUrl: s.imageUrl }))
  );
  const productSlides = $derived<Slide[]>(
    featured.slice(0, 4).map((p, i) => ({
      title: i === 0 ? store.name : p.title,
      description: i === 0 ? 'Discover our latest collection' : '',
      imageUrl: p.imageUrl
    }))
  );
  // Fall back to a single generic slide if no products
  let slides = $derived<Slide[]>(
    ownSlides.length > 0
      ? ownSlides
      : productSlides.length > 0
        ? productSlides
        : [{ title: store.name, description: 'Discover our latest collection', imageUrl: null }]
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

  let websiteLd = $derived(websiteJsonLd($page.url.origin, store.name));
</script>

<svelte:head>
  <title>{store.seoTitle || store.name}</title>
</svelte:head>

<Seo {store} type="website" jsonLd={websiteLd} />

<!-- ── Slideshow Hero ──────────────────────────────────────────────────────── -->
<section class="sf-hero" style="background:var(--sf-hero-bg, var(--sf-primary)); color:var(--sf-hero-fg, var(--sf-on-primary));">
  <div class="sf-hero-slides">
    {#each slides as slide, i}
      <div
        class="sf-hero-slide"
        class:sf-hero-slide--active={i === activeSlide}
        aria-hidden={i !== activeSlide}
      >
        {#if slide.imageUrl}
          <img src={mediaUrl(slide.imageUrl)} alt={slide.title || store.name} class="sf-hero-bg" />
          <div class="sf-hero-overlay"></div>
        {/if}
        <div class="sf-hero-content">
          {#if slide.title}
            <svelte:element this={i === 0 ? 'h1' : 'h2'} class="sf-hero-title">{slide.title}</svelte:element>
          {/if}
          {#if slide.description}
            <p class="sf-hero-sub">{slide.description}</p>
          {/if}
          <a href="{basePath}/products" class="sf-hero-cta">Shop Now</a>
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

<!-- ── 3-Column Category Grid (AC-5) — always rendered ───────────────────── -->
<section class="sf-section">
  <h2 class="sf-section-title">Shop by Category</h2>
  <div class="sf-cat-grid">
    {#if categoryTree.length > 0}
      {#each categoryTree as cat}
        <div class="sf-cat-card-group">
          <a href="{basePath}/products?category={cat.id}" class="sf-cat-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);">
            {#if cat.imageUrl}
              <img src={mediaUrl(cat.imageUrl)} alt={cat.name} class="sf-cat-img" />
            {:else}
              <div class="sf-cat-placeholder">🏷️</div>
            {/if}
            <span class="sf-cat-name">{cat.name}</span>
          </a>
          {#if cat.children.length > 0}
            <div class="sf-cat-subcats">
              {#each cat.children as child}
                <a href="{basePath}/products?category={child.id}" class="sf-cat-subcat-link">{child.name}</a>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <!-- Placeholder grid when no categories have been created yet -->
      {#each ['All Products', 'New Arrivals', 'Sale'] as label}
        <a href="{basePath}/products" class="sf-cat-card" style="border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);">
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
      <a href="{basePath}/products" class="sf-section-link">View All →</a>
    </div>

    <div class="sf-arrivals-row">
      {#each featured as product}
        <div
          class="sf-product-card sf-product-card--{cardLayout}"
          style={cardLayout === 'overlay' ? 'border-radius:var(--sf-radius-lg);' : 'border:var(--sf-card-border); border-radius:var(--sf-radius-lg); box-shadow:var(--sf-card-shadow);'}
        >
          <div class="sf-card-img-wrap">
            <ProductMedia
              src={product.imageUrl}
              alt={product.title}
              href="{basePath}/products/{product.slug}"
              shareUrl="{basePath}/products/{product.slug}"
              shareTitle="{product.title} | {store.name}"
            />
          </div>
          <a href="{basePath}/products/{product.slug}" class="sf-card-info">
            <p class="sf-card-title">{product.title}</p>
            <p class="sf-card-price" style="color:var(--sf-primary);">{store.currencySymbol} {Number(product.basePrice).toLocaleString()}</p>
            {#if product.stockQty === 0}
              <span class="sf-badge-oos">Out of Stock</span>
            {/if}
          </a>
        </div>
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
    margin-inline: calc(50% - 50vw); /* edge to edge on every screen, no white strips at the sides */
  }
  .sf-hero-slides {
    position: relative;
    min-height: 320px;
  }
  .sf-hero-slide {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
  }
  .sf-hero-slide--active {
    opacity: 1;
    pointer-events: auto;
    position: relative;
    min-height: 320px;
  }
  /* Desktop: taller, and running up under the transparent header (104 px + 1 px border) */
  @media (min-width: 1024px) {
    .sf-hero {
      margin-top: -105px; /* header height 104 px + its 1 px bottom border */
    }
    .sf-hero-slides,
    .sf-hero-slide--active {
      min-height: clamp(540px, 78vh, 760px);
    }
    .sf-hero-content {
      padding: 152px 48px 88px;
      gap: 18px;
    }
    .sf-hero .sf-hero-title { font-size: 4rem; }
    .sf-hero .sf-hero-sub { font-size: 1.125rem; }
    .sf-hero .sf-hero-cta { padding: 13px 36px; font-size: 1rem; }
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
    padding: 48px 24px 52px; /* bottom room for the slide dots */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .sf-hero-title {
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 700);
    font-size: 2.25rem;
    line-height: 1.15;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
    letter-spacing: var(--sf-letter-spacing, 0);
    margin: 0;
    text-transform: var(--sf-btn-transform, none);
  }
  .sf-hero-sub {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0;
  }
  /* Slide text animates in each time its slide becomes active: heading rises and un-blurs,
     then the description and button follow */
  @keyframes sf-hero-rise {
    from { opacity: 0; transform: translateY(28px); filter: blur(6px); }
    to { opacity: 1; transform: none; filter: none; }
  }
  .sf-hero-slide--active .sf-hero-title { animation: sf-hero-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
  .sf-hero-slide--active .sf-hero-sub { animation: sf-hero-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) 0.18s both; }
  .sf-hero-slide--active .sf-hero-cta { animation: sf-hero-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) 0.34s both; }
  @media (prefers-reduced-motion: reduce) {
    .sf-hero-slide--active :is(.sf-hero-title, .sf-hero-sub, .sf-hero-cta) { animation: none; }
  }
  /* Outline button over the slide; fills white with black text on hover */
  .sf-hero-cta {
    display: inline-block;
    padding: 10px 28px;
    background: transparent;
    color: #fff;
    border: 2px solid #fff;
    font-weight: var(--sf-btn-weight, 600);
    border-radius: var(--sf-pill, 9999px);
    text-decoration: none;
    font-size: 0.9375rem;
    text-transform: var(--sf-btn-transform, none);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .sf-hero-cta:hover,
  .sf-hero-cta:focus-visible { background: #fff; color: #000; }
  .sf-hero-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 16px;
    z-index: 3;
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
    background: var(--sf-hero-fg, #fff);
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
  /* Wrapper for parent card + optional children row */
  .sf-cat-card-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  /* Row of child category chips beneath the parent card */
  .sf-cat-subcats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sf-cat-subcat-link {
    font-size: 0.7rem;
    padding: 2px 8px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-pill, 9999px);
    color: var(--sf-muted, #6c757d);
    text-decoration: none;
    background: var(--sf-bg, #f8f9fa);
    transition: color 0.15s;
  }
  .sf-cat-subcat-link:hover {
    color: var(--sf-primary, #0d6efd);
    border-color: var(--sf-primary, #0d6efd);
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

  /* ── New arrivals: horizontal scroll on mobile, 4-col grid on desktop ── */
  .sf-arrivals-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 8px;
  }
  .sf-arrivals-row::-webkit-scrollbar { display: none; }
  @media (min-width: 1024px) {
    .sf-arrivals-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 24px;
      overflow-x: visible;
      padding-bottom: 0;
    }
  }

  /* ── Product card variants (AC-7) ── */
  .sf-product-card {
    text-decoration: none;
    color: var(--sf-text, #212529);
    background: var(--sf-surface, #fff);
    overflow: hidden;
    flex-shrink: 0;
    transition: box-shadow 0.2s;
  }
  .sf-card-info { display: block; text-decoration: none; color: inherit; }
  /* On desktop the arrivals row is a grid — cards fill columns */
  @media (min-width: 1024px) {
    .sf-product-card {
      width: 100% !important;
      flex-shrink: unset;
    }
    .sf-product-card--horizontal {
      flex-direction: column;
      align-items: stretch;
    }
    .sf-product-card--horizontal .sf-card-img-wrap {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
    }
  }

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
