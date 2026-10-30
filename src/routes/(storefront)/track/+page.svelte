<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getRecentOrders, type RecentOrder } from '$lib/stores/recentOrders';
  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');

  interface OrderResult {
    orderRef: string;
    status: string;
    createdAt: string;
    items: { title: string; quantity: number }[];
  }

  // Orders placed from this browser, so customers who forgot to copy the reference can pick it
  let recentOrders = $state<RecentOrder[]>([]);
  onMount(() => {
    recentOrders = getRecentOrders(store.id);
    // Arriving from the order-placed page (?ref=…): look that order up straight away
    const fromUrl = $page.url.searchParams.get('ref');
    if (fromUrl) trackRecent(fromUrl);
  });

  let ref = $state('');
  let loading = $state(false);
  let result = $state<'not_found' | OrderResult | null>(null);

  const statusSteps = ['pending', 'processing', 'dispatched', 'completed'];
  const statusLabels: Record<string, string> = {
    pending: 'Order Placed',
    processing: 'Processing',
    dispatched: 'Dispatched',
    completed: 'Delivered'
  };
  const statusNotes: Record<string, string> = {
    pending: 'We have received your order and will start on it shortly.',
    processing: 'Your order is being prepared.',
    dispatched: 'Your order is on its way to you.',
    completed: 'Your order has been delivered. Enjoy!'
  };

  function trackRecent(orderRef: string) {
    ref = orderRef;
    trackOrder();
  }

  async function trackOrder() {
    if (!ref.trim()) return;
    loading = true;
    result = null;
    try {
      const res = await fetch(
        `${basePath}/api/storefront/track?ref=${encodeURIComponent(ref.trim().toUpperCase())}`
      );
      if (res.ok) {
        result = await res.json() as OrderResult;
      } else {
        result = 'not_found';
      }
    } catch {
      result = 'not_found';
    } finally {
      loading = false;
    }
  }

  function stepIndex(status: string) {
    return statusSteps.indexOf(status);
  }

  function isOrderResult(r: typeof result): r is OrderResult {
    return r !== null && r !== 'not_found';
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<svelte:head>
  <title>Track Order | {store.name}</title>
</svelte:head>

<div class="track-wrap">
  <header class="track-hero">
    <span class="track-hero-icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 4h13v11H1z"/><path d="M14 8h4l4 4v3h-8z"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/>
      </svg>
    </span>
    <h1 class="track-title">Track Your Order</h1>
    <p class="track-sub">Enter your order reference to see where your order is.</p>
  </header>

  <form class="track-card track-form" onsubmit={(e) => { e.preventDefault(); trackOrder(); }}>
    <label class="track-label" for="track-ref">Order reference</label>
    <div class="track-input-row">
      <div class="track-input-wrap">
        <span class="track-input-hash" aria-hidden="true">#</span>
        <input id="track-ref" bind:value={ref} required placeholder="e.g. ORD-ABC12345" class="track-input" autocomplete="off" />
      </div>
      <button type="submit" disabled={loading} class="track-btn">
        {#if loading}<span class="track-spinner" aria-hidden="true"></span> Looking up…{:else}Track Order{/if}
      </button>
    </div>
    <p class="track-hint">You'll find it on your order confirmation, e.g. <strong>ORD-ABC12345</strong>.</p>
  </form>

  {#if result === 'not_found'}
    <div class="track-alert" role="alert">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12" y2="16"/>
      </svg>
      <div>
        <p class="track-alert-title">Order not found</p>
        <p class="track-alert-text">No order was found with those details. Please check and try again.</p>
      </div>
    </div>
  {:else if isOrderResult(result)}
    {@const current = stepIndex(result.status)}
    <section class="track-card track-result">
      <div class="track-result-head">
        <div>
          <p class="track-meta-label">Order reference</p>
          <p class="track-ref">#{result.orderRef}</p>
        </div>
        <div class="track-result-side">
          <p class="track-meta-label">Placed on</p>
          <p class="track-meta-value">{fmtDate(result.createdAt)}</p>
        </div>
      </div>

      {#if result.status === 'cancelled'}
        <div class="track-cancelled" data-testid="order-cancelled">
          <p class="track-cancelled-title">Order Cancelled</p>
          <p class="track-cancelled-text">This order has been cancelled. If you have questions, please contact the store.</p>
        </div>
      {:else}
        <p class="track-status-line">
          <span class="track-status-pill">{statusLabels[result.status] ?? result.status}</span>
          {statusNotes[result.status] ?? ''}
        </p>
        <!-- Progress: done steps filled, the current one highlighted -->
        <ol class="track-steps" style="--progress:{Math.max(0, current) / (statusSteps.length - 1)}">
          {#each statusSteps as step, i}
            <li class="track-step" class:track-step--done={i <= current} class:track-step--current={i === current}>
              <span class="track-step-dot" aria-hidden="true">
                {#if i <= current}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7"/></svg>
                {/if}
              </span>
              <span class="track-step-label">{statusLabels[step]}</span>
            </li>
          {/each}
        </ol>
      {/if}

      <div class="track-items">
        <p class="track-section-title">Items</p>
        <ul>
          {#each result.items as item}
            <li>
              <span>{item.title}</span>
              <span class="track-qty">× {item.quantity}</span>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}

  {#if recentOrders.length > 0}
    <section class="track-card track-recent" data-testid="recent-orders">
      <p class="track-section-title">Your recent orders</p>
      <ul>
        {#each recentOrders as order}
          <li>
            <button type="button" onclick={() => trackRecent(order.ref)} class="track-recent-row">
              <span class="track-recent-ref">#{order.ref}</span>
              <span class="track-recent-date">{fmtDate(order.placedAt)}</span>
              <span class="track-recent-go">Track →</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="track-help">Need help with an order? <a href="{basePath}/contact">Contact us</a></p>
</div>

<style>
  .track-wrap {
    max-width: 640px;
    margin: 0 auto;
    padding: 40px 0 56px;
    color: var(--sf-text, #212529);
  }

  .track-hero { text-align: center; margin-bottom: 28px; }
  .track-hero-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--sf-primary, #0d6efd) 12%, transparent);
    color: var(--sf-primary, #0d6efd);
  }
  .track-title {
    margin: 0 0 8px;
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 800);
    font-size: 1.875rem;
  }
  .track-sub { margin: 0; color: var(--sf-muted, #6c757d); }

  .track-card {
    background: var(--sf-bg, #fff);
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius-lg, 14px);
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  /* Search form */
  .track-label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600; }
  .track-input-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .track-input-wrap { position: relative; flex: 1 1 240px; }
  .track-input-hash {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--sf-muted, #6c757d);
    font-weight: 600;
    pointer-events: none;
  }
  .track-input {
    width: 100%;
    height: 48px;
    box-sizing: border-box;
    padding: 0 14px 0 30px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 8px);
    background: var(--sf-surface, #f8f9fa);
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.9375rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .track-input::placeholder { text-transform: none; letter-spacing: 0; }
  .track-input:focus {
    border-color: var(--sf-primary, #0d6efd);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--sf-primary, #0d6efd) 15%, transparent);
  }
  .track-btn {
    flex: 0 0 auto;
    min-width: 150px;
    height: 48px;
    padding: 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: var(--sf-radius, 8px);
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    font: inherit;
    font-size: 0.9375rem;
    font-weight: var(--sf-btn-weight, 600);
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .track-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .track-btn:disabled { opacity: 0.7; cursor: wait; }
  @media (max-width: 480px) { .track-btn { flex: 1 1 100%; } }
  .track-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: track-spin 0.7s linear infinite;
  }
  @keyframes track-spin { to { transform: rotate(360deg); } }
  .track-hint { margin: 10px 0 0; font-size: 0.75rem; color: var(--sf-muted, #6c757d); }

  /* Not found */
  .track-alert {
    display: flex;
    gap: 12px;
    padding: 16px 18px;
    margin-bottom: 20px;
    border-radius: var(--sf-radius-lg, 12px);
    background: var(--sf-error-tint, #dc26261a);
    border: 1px solid color-mix(in srgb, var(--sf-error, #dc2626) 40%, transparent);
    color: var(--sf-error, #dc2626);
  }
  .track-alert svg { flex-shrink: 0; margin-top: 1px; }
  .track-alert-title { margin: 0 0 2px; font-weight: 700; }
  .track-alert-text { margin: 0; font-size: 0.875rem; }

  /* Result */
  .track-result-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .track-result-side { text-align: right; }
  .track-meta-label { margin: 0 0 4px; font-size: 0.75rem; color: var(--sf-muted, #6c757d); }
  .track-ref { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.03em; }
  .track-meta-value { margin: 0; font-size: 0.9375rem; font-weight: 600; }

  .track-status-line { margin: 0 0 22px; font-size: 0.875rem; color: var(--sf-muted, #6c757d); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .track-status-pill {
    padding: 3px 12px;
    border-radius: 9999px;
    background: var(--sf-success-tint, #16a34a1f);
    color: var(--sf-success, #16a34a);
    font-size: 0.8125rem;
    font-weight: 700;
  }

  /* Step tracker: grey line behind, filled line up to the current step */
  .track-steps {
    position: relative;
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
    display: flex;
    justify-content: space-between;
  }
  .track-steps::before,
  .track-steps::after {
    content: '';
    position: absolute;
    top: 13px;
    left: 13px;
    height: 3px;
    border-radius: 3px;
  }
  .track-steps::before { right: 13px; background: var(--sf-border, #dee2e6); }
  .track-steps::after { width: calc((100% - 26px) * var(--progress, 0)); background: var(--sf-success, #16a34a); transition: width 0.6s ease; }
  .track-step {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    width: 26px;
  }
  .track-step-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sf-bg, #fff);
    border: 2px solid var(--sf-border, #ced4da);
    color: #fff;
  }
  .track-step--done .track-step-dot { background: var(--sf-success, #16a34a); border-color: var(--sf-success, #16a34a); }
  .track-step--current .track-step-dot { box-shadow: 0 0 0 5px color-mix(in srgb, var(--sf-success, #16a34a) 20%, transparent); }
  .track-step-label {
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
    white-space: nowrap;
    text-align: center;
  }
  .track-step:first-child .track-step-label { align-self: flex-start; }
  .track-step:last-child .track-step-label { align-self: flex-end; }
  .track-step--done .track-step-label { color: var(--sf-text, #212529); font-weight: 600; }

  .track-cancelled {
    padding: 18px;
    margin-bottom: 22px;
    border-radius: var(--sf-radius, 10px);
    text-align: center;
    background: var(--sf-error-tint, #dc26261a);
    border: 1px solid color-mix(in srgb, var(--sf-error, #dc2626) 40%, transparent);
    color: var(--sf-error, #dc2626);
  }
  .track-cancelled-title { margin: 0 0 6px; font-size: 1.125rem; font-weight: 800; }
  .track-cancelled-text { margin: 0; font-size: 0.875rem; }

  .track-section-title {
    margin: 0 0 10px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted, #6c757d);
  }
  .track-items ul,
  .track-recent ul { list-style: none; margin: 0; padding: 0; }
  .track-items li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--sf-border, #dee2e6);
    font-size: 0.875rem;
  }
  .track-qty { color: var(--sf-muted, #6c757d); white-space: nowrap; }

  /* Recent orders */
  .track-recent-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 10px;
    margin: 0 -10px;
    box-sizing: content-box;
    border: none;
    border-top: 1px solid var(--sf-border, #dee2e6);
    background: none;
    color: var(--sf-text, #212529);
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: var(--sf-radius, 6px);
    transition: background-color 0.15s ease;
  }
  .track-recent li:first-child .track-recent-row { border-top: none; }
  .track-recent-row:hover { background: var(--sf-surface, #f8f9fa); }
  .track-recent-ref { font-weight: 700; letter-spacing: 0.03em; }
  .track-recent-date { font-size: 0.8125rem; color: var(--sf-muted, #6c757d); }
  .track-recent-go { margin-left: auto; font-size: 0.8125rem; font-weight: 600; color: var(--sf-primary, #0d6efd); }

  .track-help { text-align: center; margin: 8px 0 0; font-size: 0.875rem; color: var(--sf-muted, #6c757d); }
  .track-help a { color: var(--sf-text, #212529); font-weight: 600; }
</style>
