<script lang="ts">
  import { cart, cartDiscount } from '$lib/stores/cart';
  import { onMount } from 'svelte';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);

  let discountCode = $state('');
  let discountMsg = $state('');
  let discountLoading = $state(false);
  let shippingFee = $state(0);
  let taxRate = $state(0);
  let freeShippingThreshold = $state<number | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/api/storefront/shipping-config');
      if (res.ok) {
        const cfg = await res.json();
        shippingFee = Number(cfg.flatRate) || 0;
        taxRate = Number(cfg.taxRate) || 0;
        freeShippingThreshold = cfg.freeShippingThreshold ? Number(cfg.freeShippingThreshold) : null;
      }
    } catch {
      // non-critical
    }
  });

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    discountLoading = true;
    discountMsg = '';
    try {
      const res = await fetch(`/api/storefront/discount?code=${encodeURIComponent(discountCode.trim())}`);
      if (res.ok) {
        const d = await res.json();
        const discAmt =
          d.type === 'percent'
            ? (subtotal * d.value) / 100
            : Math.min(Number(d.value), subtotal);
        cartDiscount.apply({
          code: discountCode.trim(),
          type: d.type,
          value: Number(d.value),
          amount: discAmt
        });
        discountMsg = `Discount applied: –Rs. ${discAmt.toLocaleString()}`;
      } else {
        discountMsg = 'Invalid or expired discount code.';
        cartDiscount.clear();
      }
    } catch {
      discountMsg = 'Could not validate code. Try again.';
    } finally {
      discountLoading = false;
    }
  }

  function removeDiscount() {
    cartDiscount.clear();
    discountCode = '';
    discountMsg = '';
  }

  let subtotal = $derived($cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  let effectiveShipping = $derived(
    freeShippingThreshold !== null && subtotal >= freeShippingThreshold ? 0 : shippingFee
  );
  let taxAmount = $derived(subtotal * taxRate);
  let discountAmount = $derived($cartDiscount?.amount ?? 0);
  let total = $derived(subtotal + effectiveShipping + taxAmount - discountAmount);
</script>

<svelte:head>
  <title>Cart | {store.name}</title>
</svelte:head>

<div style="max-width:1100px; margin:0 auto; padding:32px 24px;">
  <h1 style="font-size:1.75rem; font-weight:800; margin:0 0 32px;">Your Cart</h1>

  {#if $cart.length === 0}
    <div style="text-align:center; padding:80px 0; color:#6b7280;">
      <div style="font-size:4rem; margin-bottom:16px;">🛒</div>
      <p style="font-size:1.1rem; margin-bottom:24px;">Your cart is empty.</p>
      <a href="/products" style="padding:12px 28px; background:var(--store-primary,#111827); color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">
        Continue Shopping
      </a>
    </div>
  {:else}
    <div class="cart-grid" style="display:grid; grid-template-columns:1fr 360px; gap:40px;">
      <!-- Item list -->
      <div>
        {#each $cart as item}
          <div style="display:flex; gap:16px; padding:20px 0; border-bottom:1px solid #f3f4f6; align-items:flex-start;">
            <div style="width:80px; height:80px; flex-shrink:0; border-radius:8px; overflow:hidden; background:#f3f4f6;">
              {#if item.imageUrl}
                <img src={item.imageUrl} alt={item.title} style="width:100%; height:100%; object-fit:cover;" />
              {:else}
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.75rem; color:#d1d5db;">📦</div>
              {/if}
            </div>
            <div style="flex:1; min-width:0;">
              <a href="/products/{item.slug}" style="font-size:0.9rem; font-weight:600; color:#111827; text-decoration:none;">{item.title}</a>
              {#if item.variantSelections && Object.keys(item.variantSelections).length > 0}
                <p style="font-size:0.75rem; color:#6b7280; margin:4px 0 0;">
                  {Object.entries(item.variantSelections).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </p>
              {/if}
              <p style="font-size:0.9rem; font-weight:700; color:var(--store-primary,#111827); margin:8px 0 0;">
                Rs. {(item.price * item.quantity).toLocaleString()}
              </p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
              <div style="display:flex; align-items:center; border:1px solid #d1d5db; border-radius:8px; overflow:hidden;">
                <button onclick={() => cart.updateQuantity(item.productId, item.quantity - 1, item.variantSelections)}
                  style="width:32px; height:32px; border:none; background:#f9fafb; cursor:pointer; color:#374151;">−</button>
                <span style="width:36px; text-align:center; font-size:0.875rem; font-weight:600;">{item.quantity}</span>
                <button onclick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.variantSelections)}
                  style="width:32px; height:32px; border:none; background:#f9fafb; cursor:pointer; color:#374151;">+</button>
              </div>
              <button onclick={() => cart.removeItem(item.productId, item.variantSelections)}
                style="font-size:0.75rem; color:#dc2626; background:none; border:none; cursor:pointer;">Remove</button>
            </div>
          </div>
        {/each}
        <div style="margin-top:24px;">
          <a href="/products" style="color:#6b7280; font-size:0.875rem; text-decoration:none;">← Continue Shopping</a>
        </div>
      </div>

      <!-- Order summary -->
      <div style="background:#f9fafb; border-radius:12px; padding:24px; height:fit-content; position:sticky; top:24px;">
        <h2 style="font-size:1.1rem; font-weight:700; margin:0 0 20px;">Order Summary</h2>

        {#if $cartDiscount}
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; background:#dcfce7; border-radius:8px; padding:10px 14px;">
            <span style="font-size:0.8rem; color:#16a34a; font-weight:600;">🎫 {$cartDiscount.code}</span>
            <button onclick={removeDiscount} style="background:none; border:none; color:#dc2626; cursor:pointer; font-size:0.75rem;">Remove</button>
          </div>
        {:else}
          <div style="margin-bottom:16px;">
            <div style="display:flex; gap:8px;">
              <input bind:value={discountCode} placeholder="Discount code"
                style="flex:1; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:0.8rem; background:#fff;" />
              <button onclick={applyDiscount} disabled={discountLoading}
                style="padding:8px 14px; background:var(--store-primary,#111827); color:#fff; border:none; border-radius:8px; font-size:0.8rem; cursor:pointer; white-space:nowrap;">
                {discountLoading ? '…' : 'Apply'}
              </button>
            </div>
            {#if discountMsg}
              <p style="font-size:0.75rem; color:{discountMsg.includes('applied') ? '#16a34a' : '#dc2626'}; margin:6px 0 0;">{discountMsg}</p>
            {/if}
          </div>
        {/if}

        <div style="display:flex; flex-direction:column; gap:10px; font-size:0.875rem;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#6b7280;">Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#6b7280;">Shipping
              {#if freeShippingThreshold && subtotal < freeShippingThreshold}
                <span style="font-size:0.7rem; display:block; color:#9ca3af;">(Free over Rs. {freeShippingThreshold.toLocaleString()})</span>
              {/if}
            </span>
            <span>{effectiveShipping === 0 ? 'Free' : `Rs. ${effectiveShipping.toLocaleString()}`}</span>
          </div>
          {#if taxAmount > 0}
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#6b7280;">Tax ({(taxRate * 100).toFixed(1)}%)</span>
              <span>Rs. {taxAmount.toLocaleString()}</span>
            </div>
          {/if}
          {#if discountAmount > 0}
            <div style="display:flex; justify-content:space-between; color:#16a34a;">
              <span>Discount</span>
              <span>–Rs. {discountAmount.toLocaleString()}</span>
            </div>
          {/if}
        </div>

        <div style="border-top:1px solid #e5e7eb; margin:16px 0; padding-top:16px; display:flex; justify-content:space-between; font-weight:700; font-size:1rem;">
          <span>Total</span>
          <span>Rs. {Math.max(0, total).toLocaleString()}</span>
        </div>

        <a href="/checkout"
          style="display:block; width:100%; padding:14px; background:var(--store-primary,#111827); color:#fff; border-radius:10px; text-decoration:none; text-align:center; font-weight:700; font-size:1rem; box-sizing:border-box;">
          Proceed to Checkout →
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  @media (max-width: 768px) {
    :global(.cart-grid) { grid-template-columns: 1fr !important; }
  }
</style>
