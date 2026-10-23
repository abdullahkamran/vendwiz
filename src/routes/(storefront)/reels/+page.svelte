<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { onMount, tick } from 'svelte';
  import Seo from '$lib/components/storefront/Seo.svelte';
  import VideoPlayer from '$lib/components/storefront/VideoPlayer.svelte';
  import type { VideoSource } from '$lib/utils/video';
  import { nativeShare } from '$lib/utils/share';

  let { data }: { data: import('./$types').PageData } = $props();

  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');

  type Reel = {
    id: string;
    source: VideoSource;
    caption: string | null;
    product: {
      id: string;
      title: string;
      slug: string;
      image: string | null;
      basePrice: number;
      salePrice: number | null;
    };
  };

  let reels = $state<Reel[]>([]);
  let nextOffset = $state<number | null>(0);
  let loading = $state(false);
  let loadError = $state(false);
  let initialised = $state(false);

  let activeIndex = $state(0);
  // Every reel starts muted; once the shopper unmutes, later reels follow their choice
  let muted = $state(true);
  let paused = $state(false);

  // Playback position of the reel on screen, for the progress bar
  let currentTime = $state(0);
  let duration = $state(0);
  let progress = $derived(duration > 0 ? Math.min(1, currentTime / duration) : 0);

  // Reel opened from a shared link (?v=<id>) is shown first
  let focusId = $state<string | null>(null);

  let feedEl = $state<HTMLDivElement | null>(null);
  let players: Record<string, VideoPlayer | undefined> = $state({});

  async function loadMore() {
    if (loading || nextOffset === null) return;
    loading = true;
    loadError = false;
    try {
      const q = new URLSearchParams({ offset: String(nextOffset), limit: '10' });
      if (focusId && nextOffset === 0) q.set('focus', focusId);
      const res = await fetch(`${basePath}/api/storefront/reels?${q}`);
      if (!res.ok) throw new Error(String(res.status));
      const body: { reels: Reel[]; nextOffset: number | null } = await res.json();
      // The focused reel also appears in its normal place in later pages — skip duplicates
      const seen = new Set(reels.map((r) => r.id));
      reels = [...reels, ...body.reels.filter((r) => !seen.has(r.id))];
      nextOffset = body.nextOffset;
    } catch {
      loadError = true;
    } finally {
      loading = false;
      initialised = true;
    }
    await tick();
    observeReels();
  }

  // ── Track which reel is on screen ──
  let observer: IntersectionObserver | null = null;
  function observeReels() {
    if (!observer || !feedEl) return;
    feedEl.querySelectorAll<HTMLElement>('[data-reel-index]').forEach((el) => observer!.observe(el));
  }

  $effect(() => {
    // Load the next page when the shopper nears the end of what is loaded
    if (initialised && activeIndex >= reels.length - 3) loadMore();
  });

  function onProgress(t: number, d: number) {
    currentTime = t;
    duration = d;
  }

  // Tap / click on the progress bar jumps to that point
  function seek(e: MouseEvent, reel: Reel) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    players[reel.id]?.seek((e.clientX - rect.left) / rect.width);
  }

  // ── Sharing: the browser / phone's own share menu (WhatsApp, Messenger, TikTok, ...) ──
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  async function share(reel: Reel) {
    const p = reel.product;
    const result = await nativeShare({
      title: p.title,
      text: `${p.title} – ${money(onSale(p) ? p.salePrice! : p.basePrice)} at ${store.name}`,
      url: `${location.origin}${basePath}/reels?v=${encodeURIComponent(reel.id)}`
    });
    if (result === 'copied') {
      toast = 'Link copied';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (toast = ''), 2500);
    }
  }

  // ── Price helpers ──
  function money(n: number) {
    return `${store.currencySymbol} ${n.toLocaleString()}`;
  }
  function onSale(p: Reel['product']) {
    return p.salePrice !== null && p.salePrice < p.basePrice;
  }
  function productHref(p: Reel['product']) {
    return `${basePath}/products/${p.slug}`;
  }

  // ── Size the feed to the space actually left on screen ──
  // Whatever sits above it (announcement bar, install banner, open search box) varies per store,
  // so measure instead of assuming: feed bottom must meet the bottom nav (mobile) or a margin (desktop).
  let feedHeight = $state<number | null>(null);
  function fitFeed() {
    if (!feedEl) return;
    const top = feedEl.getBoundingClientRect().top + window.scrollY;
    const nav = document.querySelector<HTMLElement>('.sf-bottom-nav');
    const below = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 24;
    feedHeight = Math.max(320, window.innerHeight - top - below);
  }

  onMount(() => {
    fitFeed();
    window.scrollTo(0, 0);
    window.addEventListener('resize', fitFeed);
    // Re-fit when the header grows/shrinks (e.g. search box opened)
    const header = document.querySelector('.sf-header');
    const headerObserver = header ? new ResizeObserver(fitFeed) : null;
    if (header) headerObserver!.observe(header);

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
            if (idx !== activeIndex) {
              activeIndex = idx;
              paused = false;
              currentTime = 0;
              duration = 0;
            }
          }
        }
      },
      { root: feedEl, threshold: 0.6 }
    );
    focusId = new URL(location.href).searchParams.get('v');
    loadMore();
    return () => {
      window.removeEventListener('resize', fitFeed);
      headerObserver?.disconnect();
      observer?.disconnect();
    };
  });
</script>

{#if data.shared}
  <Seo
    {store}
    title="{data.shared.title} | {store.name}"
    description={data.shared.caption || `Watch ${data.shared.title} on ${store.name} and shop what you see.`}
    image={data.shared.image}
    card="summary_large_image"
  />
{:else}
  <Seo {store} title="Reels | {store.name}" description="Watch short videos of products from {store.name} and shop what you see." />
{/if}

<div class="reels-page">
  <div
    class="reels-feed"
    bind:this={feedEl}
    style={feedHeight ? `height:${feedHeight}px` : undefined}
  >
    {#each reels as reel, i (reel.id)}
      {@const p = reel.product}
      {@const isActive = i === activeIndex}
      <section class="reel" data-reel-index={i} aria-label="{p.title} video">
        <!-- Only the reel on screen gets a live player; the rest show a thumbnail -->
        <VideoPlayer
          bind:this={players[reel.id]}
          source={reel.source}
          title="{p.title} video"
          active={isActive}
          {muted}
          paused={isActive && paused}
          onTogglePause={() => (paused = !paused)}
          {onProgress}
        />

        <!-- Mute toggle -->
        <button class="reel-mute" onclick={() => (muted = !muted)} aria-label={muted ? 'Unmute' : 'Mute'}>
          {#if muted}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>
            </svg>
          {/if}
        </button>

        <!-- Side actions -->
        <div class="reel-actions">
          <button class="reel-action" onclick={() => share(reel)} aria-label="Share this video">
            <span class="reel-action-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </span>
            <span>Share</span>
          </button>
        </div>

        <!-- Product card + add to cart -->
        <div class="reel-info">
          {#if reel.caption}<p class="reel-caption">{reel.caption}</p>{/if}
          <!-- Progress bar -->
          <button
            class="reel-progress"
            onclick={(e) => seek(e, reel)}
            aria-label="Seek video"
            tabindex="-1"
          >
            <span class="reel-progress-track">
              <span class="reel-progress-fill" style="width:{isActive ? progress * 100 : 0}%"></span>
            </span>
          </button>
          <div class="reel-product">
            <a href={productHref(p)} class="reel-product-link">
              {#if p.image}
                <img src={mediaUrl(p.image)} alt="" class="reel-product-img" />
              {/if}
              <span class="reel-product-text">
                <span class="reel-product-title">{p.title}</span>
                <span class="reel-price">
                  {#if onSale(p)}
                    <span class="reel-price-now">{money(p.salePrice!)}</span>
                    <s class="reel-price-was">{money(p.basePrice)}</s>
                  {:else}
                    <span class="reel-price-now">{money(p.basePrice)}</span>
                  {/if}
                </span>
              </span>
            </a>
            <a href={productHref(p)} class="reel-cart-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
              </svg>
              Add to cart
            </a>
          </div>
        </div>

      </section>
    {/each}

    {#if initialised && reels.length === 0 && !loading}
      <div class="reels-empty">
        {#if loadError}
          <p>Couldn't load videos.</p>
          <button class="reels-empty-btn" onclick={loadMore}>Try again</button>
        {:else}
          <p>No videos yet — check back soon.</p>
          <a href="{basePath}/products" class="reels-empty-btn">Browse products</a>
        {/if}
      </div>
    {:else if !initialised || (loading && reels.length === 0)}
      <div class="reels-empty"><span class="reels-spinner" aria-label="Loading videos"></span></div>
    {/if}
  </div>
</div>

{#if toast}
  <div class="reels-toast" role="status">{toast}</div>
{/if}

<style>
  /* Feed fills the space between the sticky header (64px) and the bottom nav (60px) on mobile */
  .reels-page {
    margin-inline: -16px; /* full-bleed inside .sf-container */
  }
  .reels-feed {
    height: calc(100dvh - 64px); /* refined by fitFeed() once mounted */
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    overscroll-behavior-y: contain;
    background: #000; /* black gap between reels */
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .reels-feed::-webkit-scrollbar { display: none; }

  @media (min-width: 1024px) {
    .reels-page {
      margin-inline: 0;
      padding: 24px 0;
      display: flex;
      justify-content: center;
    }
    .reels-feed {
      width: min(420px, 100%);
      height: calc(100vh - 88px - 48px);
      border-radius: var(--sf-radius-lg, 12px);
    }
  }

  .reel {
    position: relative;
    flex: 0 0 100%;
    height: 100%;
    border-radius: var(--sf-radius, 6px);
    scroll-snap-align: start;
    scroll-snap-stop: always;
    overflow: hidden;
    background: #000;
    color: #fff;
  }

  .reel-mute {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .reel-info {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    padding: 48px 14px 14px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
    pointer-events: none; /* let swipes through except on the actual controls */
  }
  .reel-caption {
    padding-right: 60px; /* clear the share button */
    margin: 0 0 10px;
    font-size: 0.875rem;
    line-height: 1.4;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .reel-product {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: var(--sf-radius-lg, 12px);
    background: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    pointer-events: auto;
  }
  .reel-product-link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;
  }
  .reel-product-img {
    width: 44px;
    height: 44px;
    border-radius: var(--sf-radius, 6px);
    object-fit: cover;
    background: #fff;
    flex-shrink: 0;
  }
  .reel-product-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .reel-product-title {
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .reel-price {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 0.875rem;
  }
  .reel-price-now { font-weight: 700; }
  .reel-price-was { opacity: 0.7; font-size: 0.75rem; }

  .reel-cart-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 999px;
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    font-size: 0.8125rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  }

  .reels-empty {
    flex: 0 0 100%;
    height: 100%;
    background: #000;
    border-radius: var(--sf-radius, 6px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: #fff;
    text-align: center;
    padding: 24px;
  }
  .reels-empty p { margin: 0; opacity: 0.85; }
  .reels-empty-btn {
    padding: 10px 18px;
    border-radius: 999px;
    border: 0;
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    font: inherit;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  /* ── Side actions (share) ── */
  .reel-actions {
    position: absolute;
    right: 10px;
    bottom: 124px; /* above the progress bar + price card */
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .reel-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: 0;
    padding: 0;
    color: #fff;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    cursor: pointer;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }
  .reel-action-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Progress bar: thin line along the bottom edge, taller hit area for seeking ── */
  .reel-progress {
    width: 100%;
    height: 18px; /* taller hit area than the visible line */
    margin-bottom: 6px;
    padding: 0;
    pointer-events: auto;
    background: none;
    border: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  .reel-progress-track {
    position: relative;
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.35);
    transition: height 0.15s;
  }
  .reel-progress:hover .reel-progress-track { height: 6px; }
  .reel-progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: #fff;
    transition: width 0.25s linear;
  }

  .reels-toast {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 80;
    padding: 10px 18px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    pointer-events: none;
  }

  .reels-spinner {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    animation: reels-spin 0.8s linear infinite;
  }
  @keyframes reels-spin { to { transform: rotate(360deg); } }
</style>
