<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { nativeShare } from '$lib/utils/share';

  // Product image with a zoom toggle and a share button for the product link. The zoom button
  // turns red while on; the image is then magnified 65% and follows the cursor (or finger). Fills its parent box, so the
  // parent sets the size / aspect ratio.
  let {
    src,
    alt,
    href = null,
    shareUrl,
    shareTitle
  }: {
    src: string | null | undefined; // stored image path (resolved with mediaUrl)
    alt: string;
    href?: string | null; // product page link for the image itself
    shareUrl: string; // product page path or URL to share
    shareTitle: string;
  } = $props();

  let origin = $state('50% 50%');
  let zoomed = $state(false);
  let copied = $state(false);
  let copiedTimer: ReturnType<typeof setTimeout>;

  function onMove(e: PointerEvent) {
    if (!zoomed) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    origin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  }

  function zoom(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    zoomed = !zoomed;
    if (!zoomed) origin = '50% 50%';
  }

  // While zoomed, clicks (and taps that end a pan) only pan: they don't open the product or
  // move the product page gallery to the next image.
  function onClick(e: MouseEvent) {
    if (!zoomed) return;
    e.preventDefault();
    e.stopPropagation();
  }

  async function share(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = new URL(shareUrl, location.href).href;
    const result = await nativeShare({ title: shareTitle, text: shareTitle, url });
    if (result === 'copied') {
      copied = true;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copied = false), 1800);
    }
  }
</script>

{#snippet picture()}
  {#if src}
    <img src={mediaUrl(src)} {alt} class="pm-img" style="transform-origin:{origin}" />
  {:else}
    <div class="pm-ph" aria-hidden="true">📦</div>
  {/if}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events (only stops clicks from inside while zoomed) -->
<div class="pm" class:pm--zoomed={zoomed} onpointermove={onMove} onpointerdown={onMove} onclick={onClick}>
  {#if href}
    <a {href} class="pm-link" aria-label={alt}>{@render picture()}</a>
  {:else}
    {@render picture()}
  {/if}

  <div class="pm-tools">
    {#if src}
      <button type="button" class="pm-btn pm-btn--zoom" class:pm-btn--on={zoomed} onclick={zoom}
        aria-label={zoomed ? 'Stop zooming' : 'Zoom image'} aria-pressed={zoomed} title={zoomed ? 'Stop zooming' : 'Zoom'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
    {/if}
    <button type="button" class="pm-btn pm-btn--share" onclick={share} aria-label="Share product" title="Share">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
      </svg>
    </button>
  </div>
  {#if copied}<span class="pm-copied" role="status">Link copied</span>{/if}
</div>

<style>
  .pm {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--sf-bg, #f8f9fa);
    container-type: inline-size;
  }
  /* Small thumbnails (e.g. the Playful theme's row cards): smaller, tighter buttons */
  @container (max-width: 130px) {
    .pm-tools { top: 4px; right: 4px; gap: 4px; }
    .pm-btn { width: 26px; height: 26px; }
    .pm-btn svg { width: 13px; height: 13px; }
  }
  .pm-link { display: block; width: 100%; height: 100%; }
  .pm-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }
  /* Zoom on: magnified, panned by moving the pointer; drags pan instead of scrolling the page */
  .pm--zoomed { touch-action: none; cursor: zoom-in; }
  .pm--zoomed .pm-img { transform: scale(1.65); }
  .pm-ph {
    width: 100%;
    height: 100%;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--sf-muted, #9ca3af);
  }
  .pm-tools {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pm-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease;
  }
  .pm-btn:hover { transform: scale(1.08); }
  .pm-btn--zoom { background: rgba(255, 255, 255, 0.95); color: #212529; }
  .pm-btn--zoom.pm-btn--on { background: #e53935; color: #fff; }
  .pm-btn--share { background: rgba(255, 255, 255, 0.95); color: #212529; }
  .pm-copied {
    position: absolute;
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%);
    z-index: 3;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 0.75rem;
    white-space: nowrap;
  }
</style>
