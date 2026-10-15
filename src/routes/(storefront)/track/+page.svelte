<script lang="ts">
  import { onMount } from 'svelte';
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
  onMount(() => { recentOrders = getRecentOrders(store.id); });

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
</script>

<svelte:head>
  <title>Track Order | {store.name}</title>
</svelte:head>

<div class="track-wrap">
  <h1 style="font-size:1.75rem; font-weight:800; margin:0 0 8px; color:var(--sf-text);">Track Your Order</h1>
  <p style="color:var(--sf-muted); margin:0 0 32px;">Enter your order reference number to see the current status.</p>

  <form onsubmit={(e) => { e.preventDefault(); trackOrder(); }}
    style="border:1px solid var(--sf-border); border-radius:12px; padding:24px; margin-bottom:32px;">
    <div style="margin-bottom:20px;">
      <label style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Order Reference</label>
      <input bind:value={ref} required placeholder="e.g. ORD-ABC12345"
        style="width:100%; border:1px solid var(--sf-border); border-radius:8px; padding:10px 14px; font-size:0.9rem; box-sizing:border-box; text-transform:uppercase; background:var(--sf-surface); color:var(--sf-text);" />
    </div>
    <button type="submit" disabled={loading}
      style="width:100%; padding:12px; background:var(--sf-primary); color:var(--sf-on-primary); border:none; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer;">
      {loading ? 'Looking up…' : 'Track Order'}
    </button>
  </form>

  {#if recentOrders.length > 0}
    <div data-testid="recent-orders" style="border:1px solid var(--sf-border); border-radius:12px; padding:20px 24px; margin-bottom:32px;">
      <p style="font-size:0.8rem; font-weight:600; color:var(--sf-text); text-transform:uppercase; letter-spacing:0.05em; margin:0 0 12px;">Your recent orders</p>
      {#each recentOrders as order}
        <button type="button" onclick={() => trackRecent(order.ref)}
          style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 0; background:none; border:none; border-bottom:1px solid var(--sf-border); cursor:pointer; text-align:left; color:var(--sf-text);">
          <span style="font-family:monospace; font-weight:700;">#{order.ref}</span>
          <span style="font-size:0.8rem; color:var(--sf-muted);">{new Date(order.placedAt).toLocaleDateString()} · Track →</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if result === 'not_found'}
    <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:10px; padding:20px; text-align:center; color:#dc2626;">
      <p style="font-weight:600; margin:0 0 6px;">Order not found</p>
      <p style="font-size:0.875rem; margin:0;">No order was found with those details. Please check and try again.</p>
    </div>
  {:else if isOrderResult(result)}
    <div style="border:1px solid var(--sf-border); border-radius:12px; padding:24px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
        <div>
          <p style="font-size:0.8rem; color:var(--sf-muted); margin:0 0 4px;">Order Reference</p>
          <p style="font-size:1.25rem; font-weight:800; font-family:monospace; margin:0; color:var(--sf-text);">#{result.orderRef}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:0.8rem; color:var(--sf-muted); margin:0 0 4px;">Placed on</p>
          <p style="font-size:0.875rem; font-weight:600; margin:0; color:var(--sf-text);">{new Date(result.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <!-- Status timeline / cancelled card -->
      <div style="margin-bottom:24px;">
        <p style="font-size:0.8rem; font-weight:600; color:var(--sf-text); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:16px;">Status</p>
        {#if result.status === 'cancelled'}
          <div class="track-cancelled" data-testid="order-cancelled" style="background:#fee2e2; border:1px solid #fca5a5; border-radius:10px; padding:20px; text-align:center; color:#dc2626;">
            <p style="font-size:1.25rem; font-weight:800; margin:0 0 8px;">Order Cancelled</p>
            <p style="font-size:0.875rem; margin:0;">This order has been cancelled. If you have questions, please contact the store.</p>
          </div>
        {:else}
          <div style="position:relative; display:flex; justify-content:space-between;">
            <div style="position:absolute; top:12px; left:0; right:0; height:2px; background:var(--sf-muted); opacity:0.4; z-index:0;"></div>
            <div style="position:absolute; top:12px; left:0; height:2px; background:var(--sf-primary); z-index:1; width:{Math.max(0, stepIndex(result.status)) / (statusSteps.length - 1) * 100}%;"></div>
            {#each statusSteps as step, i}
              {@const active = i <= stepIndex(result.status)}
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; position:relative; z-index:2;">
                <div style="width:24px; height:24px; border-radius:50%; background:{active ? 'var(--sf-primary)' : 'var(--sf-surface)'}; border:2px solid {active ? 'var(--sf-primary)' : 'var(--sf-muted)'}; display:flex; align-items:center; justify-content:center;">
                  {#if active}<span style="color:var(--sf-on-primary); font-size:0.7rem;">✓</span>{/if}
                </div>
                <span style="font-size:0.7rem; color:{active ? 'var(--sf-text)' : 'var(--sf-muted)'}; font-weight:{active ? '600' : '400'}; white-space:nowrap;">{statusLabels[step]}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Items summary -->
      <div>
        <p style="font-size:0.8rem; font-weight:600; color:var(--sf-text); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">Items</p>
        {#each result.items as item}
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--sf-border); font-size:0.875rem;">
            <span style="color:var(--sf-text);">{item.title}</span>
            <span style="color:var(--sf-muted);">×{item.quantity}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .track-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 32px;
  }
</style>
