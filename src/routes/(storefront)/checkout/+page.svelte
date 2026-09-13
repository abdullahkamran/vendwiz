<script lang="ts">
  import { cart, cartDiscount } from '$lib/stores/cart';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);

  onMount(() => {
    if ($cart.length === 0) goto('/');
  });

  let name = $state('');
  let phone = $state('');
  let email = $state('');
  let address = $state('');
  let notes = $state('');
  let submitting = $state(false);
  let errorMsg = $state('');

  async function placeOrder() {
    if ($cart.length === 0) return;
    submitting = true;
    errorMsg = '';
    try {
      const body = {
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        shippingAddress: address,
        notes: notes || undefined,
        discountCode: $cartDiscount?.code || undefined,
        items: $cart.map((i) => ({
          productId: i.productId,
          title: i.title,
          slug: i.slug,
          imageUrl: i.imageUrl,
          price: i.price,
          quantity: i.quantity,
          variantSelections: i.variantSelections
        }))
      };
      const res = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json as { orderRef?: string }).orderRef) {
        cart.clear();
        cartDiscount.clear();
        goto(`/checkout/confirmation?ref=${(json as { orderRef: string }).orderRef}`);
      } else {
        errorMsg = (json as { error?: string }).error ?? 'Order failed. Please try again.';
      }
    } catch {
      errorMsg = 'Network error. Please check your connection.';
    } finally {
      submitting = false;
    }
  }

  let subtotal = $derived($cart.reduce((s, i) => s + i.price * i.quantity, 0));
</script>

<svelte:head>
  <title>Checkout | {store.name}</title>
</svelte:head>

<div style="max-width:1000px; margin:0 auto; padding:32px 24px;">
  <h1 style="font-size:1.75rem; font-weight:800; margin:0 0 32px;">Checkout</h1>

  <div class="checkout-grid" style="display:grid; grid-template-columns:1fr 360px; gap:40px;">
    <!-- Customer form -->
    <form onsubmit={(e) => { e.preventDefault(); placeOrder(); }}>
      <div style="border:1px solid #e5e7eb; border-radius:12px; padding:24px; margin-bottom:24px;">
        <h2 style="font-size:1.1rem; font-weight:700; margin:0 0 20px;">Contact & Shipping</h2>

        <div style="margin-bottom:16px;">
          <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Full Name *</label>
          <input bind:value={name} required minlength="2" placeholder="Your full name"
            style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:0.9rem; box-sizing:border-box;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Phone Number *</label>
          <input bind:value={phone} required type="tel" placeholder="e.g. 03001234567"
            style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:0.9rem; box-sizing:border-box;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Email Address *</label>
          <input bind:value={email} required type="email" placeholder="you@example.com"
            style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:0.9rem; box-sizing:border-box;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Shipping Address *</label>
          <textarea bind:value={address} required minlength="10" rows="3" placeholder="Full shipping address including city"
            style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:0.9rem; resize:vertical; box-sizing:border-box;"></textarea>
        </div>

        <div>
          <label style="font-size:0.875rem; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Order Notes (optional)</label>
          <textarea bind:value={notes} rows="2" placeholder="Any special instructions…"
            style="width:100%; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:0.9rem; resize:vertical; box-sizing:border-box;"></textarea>
        </div>
      </div>

      {#if errorMsg}
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:12px 16px; color:#dc2626; font-size:0.875rem; margin-bottom:16px;">
          {errorMsg}
        </div>
      {/if}

      <button type="submit" disabled={submitting || $cart.length === 0}
        style="width:100%; padding:14px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:10px; font-size:1rem; font-weight:700; cursor:pointer;">
        {submitting ? 'Placing Order…' : 'Place Order'}
      </button>
    </form>

    <!-- Order summary -->
    <div style="background:#f9fafb; border-radius:12px; padding:24px; height:fit-content; position:sticky; top:24px;">
      <h2 style="font-size:1.1rem; font-weight:700; margin:0 0 16px;">Order Summary</h2>
      {#each $cart as item}
        <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center;">
          <div style="width:48px; height:48px; border-radius:6px; overflow:hidden; background:#e5e7eb; flex-shrink:0;">
            {#if item.imageUrl}
              <img src={item.imageUrl} alt="" style="width:100%; height:100%; object-fit:cover;" />
            {:else}
              <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.25rem; color:#9ca3af;">📦</div>
            {/if}
          </div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:0.8rem; font-weight:600; color:#111827; margin:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">{item.title}</p>
            <p style="font-size:0.75rem; color:#6b7280; margin:2px 0 0;">×{item.quantity}</p>
          </div>
          <span style="font-size:0.875rem; font-weight:600; white-space:nowrap;">Rs. {(item.price * item.quantity).toLocaleString()}</span>
        </div>
      {/each}
      <div style="border-top:1px solid #e5e7eb; margin-top:16px; padding-top:16px;">
        <div style="display:flex; justify-content:space-between; font-size:0.875rem; margin-bottom:6px;">
          <span style="color:#6b7280;">Subtotal</span>
          <span>Rs. {subtotal.toLocaleString()}</span>
        </div>
        {#if $cartDiscount}
          <div style="display:flex; justify-content:space-between; font-size:0.875rem; color:#16a34a; margin-bottom:6px;">
            <span>Discount ({$cartDiscount.code})</span>
            <span>–Rs. {$cartDiscount.amount.toLocaleString()}</span>
          </div>
        {/if}
        <p style="font-size:0.7rem; color:#9ca3af; margin:4px 0 0;">Shipping &amp; tax calculated server-side</p>
      </div>
    </div>
  </div>
</div>

<style>
  @media (max-width: 768px) {
    :global(.checkout-grid) { grid-template-columns: 1fr !important; }
  }
</style>
