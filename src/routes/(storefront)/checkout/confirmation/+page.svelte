<script lang="ts">
  import { page } from '$app/stores';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);

  let orderRef = $derived($page.url.searchParams.get('ref') ?? '');

  let copied = $state(false);
  async function copyRef() {
    await navigator.clipboard.writeText(orderRef);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  let waPhone = $derived(store.whatsapp?.replace(/\D/g, '') ?? '');
  let waMsg = $derived(encodeURIComponent(`Hi! I just placed order #${orderRef} on ${store.name}. Please confirm.`));
  let waUrl = $derived(waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : null);
</script>

<svelte:head>
  <title>Order Confirmed | {store.name}</title>
</svelte:head>

<div style="max-width:560px; margin:80px auto; padding:0 24px; text-align:center;">
  <div style="width:80px; height:80px; background:#dcfce7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin:0 auto 24px;">
    ✓
  </div>

  <h1 style="font-size:1.75rem; font-weight:800; color:#111827; margin:0 0 12px;">Order Placed Successfully!</h1>
  <p style="color:#6b7280; margin:0 0 32px; line-height:1.6;">
    Thank you for your order. Your order is being processed and you'll be notified when it ships.
  </p>

  {#if orderRef}
    <div style="background:#f3f4f6; border-radius:10px; padding:16px 24px; margin-bottom:32px; display:flex; align-items:center; justify-content:center; gap:12px;">
      <span style="color:#6b7280; font-size:0.875rem;">Order Reference:</span>
      <span style="font-size:1.25rem; font-weight:800; color:#111827; font-family:monospace;">#{orderRef}</span>
      <button onclick={copyRef} title="Copy reference"
        style="background:none; border:none; cursor:pointer; font-size:1rem; color:#6b7280;">
        {copied ? '✓' : '📋'}
      </button>
    </div>
  {/if}

  <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
    {#if waUrl}
      <a href={waUrl} target="_blank" rel="noopener"
        style="display:inline-flex; align-items:center; gap:8px; padding:12px 28px; background:#25D366; color:#fff; border-radius:10px; text-decoration:none; font-weight:600; font-size:0.9rem;">
        💬 Send WhatsApp Confirmation
      </a>
    {/if}

    <a href="/track"
      style="padding:12px 28px; background:#f3f4f6; color:#374151; border-radius:10px; text-decoration:none; font-weight:600; font-size:0.9rem;">
      Track Your Order
    </a>

    <a href="/products"
      style="padding:12px 28px; background:var(--store-primary,#111827); color:#fff; border-radius:10px; text-decoration:none; font-weight:600; font-size:0.9rem;">
      Continue Shopping
    </a>
  </div>
</div>
