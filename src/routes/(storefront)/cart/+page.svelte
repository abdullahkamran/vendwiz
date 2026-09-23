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

<div style="padding:16px;">
  <h1 style="font-size:1.5rem; font-weight:800; margin:0 0 24px; color:var(--sf-text);">Your Cart</h1>

  {#if $cart.length === 0}
    <!-- Empty state: dashed circle -->
    <div style="text-align:center; padding:64px 0;">
      <div style="width:80px; height:80px; border-radius:50%; border:2px dashed var(--sf-border); display:inline-flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:16px; color:var(--sf-muted);">
        🛒
      </div>
      <p style="font-size:1rem; color:var(--sf-muted); margin:0 0 20px;">Your cart is empty.</p>
      <a href="/products"
        style="padding:10px 24px; background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-pill); text-decoration:none; font-weight:var(--sf-btn-weight); font-size:0.9rem; text-transform:var(--sf-btn-transform); letter-spacing:var(--sf-letter-spacing);">
        Continue Shopping
      </a>
    </div>
  {:else}
    <!-- Item list -->
    {#each $cart as item}
      <div style="display:flex; gap:12px; padding:16px 0; border-top:1px solid var(--sf-border); align-items:flex-start;">
        <!-- Thumb: 72 × 82 -->
        <div style="width:72px; height:82px; flex-shrink:0; border-radius:var(--sf-radius); overflow:hidden; background:var(--sf-surface);">
          {#if item.imageUrl}
            <img src={item.imageUrl} alt={item.title} style="width:100%; height:100%; object-fit:cover;" />
          {:else}
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.75rem; color:var(--sf-muted);">📦</div>
          {/if}
        </div>

        <!-- Details -->
        <div style="flex:1; min-width:0;">
          <a href="/products/{item.slug}" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); text-decoration:none; display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">{item.title}</a>
          {#if item.variantSelections && Object.keys(item.variantSelections).length > 0}
            <p style="font-size:0.75rem; color:var(--sf-muted); margin:3px 0 0;">
              {Object.entries(item.variantSelections).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          {/if}
          <p style="font-size:0.875rem; font-weight:700; color:var(--sf-primary); margin:6px 0 0;">
            Rs. {(item.price * item.quantity).toLocaleString()}
          </p>
          <!-- Unit price when qty > 1 -->
          {#if item.quantity > 1}
            <p style="font-size:0.75rem; color:var(--sf-muted); margin:2px 0 0;">Rs. {item.price.toLocaleString()} each</p>
          {/if}
        </div>

        <!-- Qty stepper + remove -->
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0;">
          <div style="display:flex; align-items:center; border:1px solid var(--sf-border); border-radius:var(--sf-radius); overflow:hidden;">
            <button
              onclick={() => cart.updateQuantity(item.productId, item.quantity - 1, item.variantSelections)}
              style="width:30px; height:30px; border:none; background:var(--sf-surface); cursor:pointer; color:var(--sf-text); font-size:1rem; display:flex; align-items:center; justify-content:center;">−</button>
            <span style="width:32px; text-align:center; font-size:0.875rem; font-weight:600; color:var(--sf-text);">{item.quantity}</span>
            <button
              onclick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.variantSelections)}
              style="width:30px; height:30px; border:none; background:var(--sf-surface); cursor:pointer; color:var(--sf-text); font-size:1rem; display:flex; align-items:center; justify-content:center;">+</button>
          </div>
          <!-- ✕ remove -->
          <button
            onclick={() => cart.removeItem(item.productId, item.variantSelections)}
            style="font-size:0.75rem; color:var(--sf-muted); background:none; border:none; cursor:pointer; padding:0; line-height:1;">✕ Remove</button>
        </div>
      </div>
    {/each}

    <!-- Continue shopping -->
    <div style="padding:16px 0; border-top:1px solid var(--sf-border);">
      <a href="/products" style="color:var(--sf-muted); font-size:0.875rem; text-decoration:none;">← Continue Shopping</a>
    </div>

    <!-- Order summary box -->
    <div style="background:var(--sf-surface); border-radius:var(--sf-radius-lg); padding:20px; margin-top:8px; border:1px solid var(--sf-border);">
      <h2 style="font-size:1rem; font-weight:700; margin:0 0 16px; color:var(--sf-text);">Order Summary</h2>

      <!-- Discount code input (shown when no discount applied) -->
      {#if $cartDiscount}
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; background:var(--sf-success-tint); border:1px solid var(--sf-success); border-radius:var(--sf-radius); padding:10px 14px;">
          <span style="font-size:0.8rem; color:var(--sf-success); font-weight:600;">🎫 {$cartDiscount.code}</span>
          <button onclick={removeDiscount} style="background:none; border:none; color:var(--sf-error); cursor:pointer; font-size:0.75rem;">Remove</button>
        </div>
      {:else}
        <div style="margin-bottom:16px;">
          <div style="display:flex; gap:8px;">
            <input
              bind:value={discountCode}
              placeholder="Discount code"
              style="flex:1; border:1px solid var(--sf-border); border-radius:var(--sf-radius); padding:8px 12px; font-size:0.8rem; background:var(--sf-bg); color:var(--sf-text);"
            />
            <button
              onclick={applyDiscount}
              disabled={discountLoading}
              style="padding:8px 14px; background:var(--sf-surface); color:var(--sf-primary); border:1px solid var(--sf-primary); border-radius:var(--sf-radius); font-size:0.8rem; cursor:pointer; white-space:nowrap; font-weight:600;">
              {discountLoading ? '…' : 'Apply'}
            </button>
          </div>
          {#if discountMsg}
            <p style="font-size:0.75rem; color:{discountMsg.includes('applied') ? 'var(--sf-success)' : 'var(--sf-error)'}; margin:6px 0 0;">{discountMsg}</p>
          {/if}
        </div>
      {/if}

      <!-- Line items -->
      <div style="display:flex; flex-direction:column; gap:10px; font-size:0.875rem;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--sf-muted);">Subtotal</span>
          <span style="color:var(--sf-text);">Rs. {subtotal.toLocaleString()}</span>
        </div>

        {#if discountAmount > 0}
          <div style="display:flex; justify-content:space-between; color:var(--sf-success);">
            <span>Discount</span>
            <span>–Rs. {discountAmount.toLocaleString()}</span>
          </div>
        {/if}

        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--sf-muted);">
            Shipping
            {#if freeShippingThreshold !== null && subtotal < freeShippingThreshold}
              <span style="font-size:0.7rem; display:block; color:var(--sf-muted);">Free over Rs. {freeShippingThreshold.toLocaleString()}</span>
            {/if}
          </span>
          <span style="color:var(--sf-text);">{effectiveShipping === 0 ? 'Free' : `Rs. ${effectiveShipping.toLocaleString()}`}</span>
        </div>

        {#if taxAmount > 0}
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--sf-muted);">Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span style="color:var(--sf-text);">Rs. {taxAmount.toLocaleString()}</span>
          </div>
        {/if}
      </div>

      <!-- Total -->
      <div style="border-top:1px solid var(--sf-border); margin:16px 0 0; padding-top:16px; display:flex; justify-content:space-between; font-weight:700; font-size:1rem; color:var(--sf-text);">
        <span>Total</span>
        <span>Rs. {Math.max(0, total).toLocaleString()}</span>
      </div>

      <!-- CTA: pill primary button -->
      <a href="/checkout"
        style="display:block; width:100%; padding:14px; background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-pill); text-decoration:none; text-align:center; font-weight:var(--sf-btn-weight); font-size:1rem; box-sizing:border-box; margin-top:16px; text-transform:var(--sf-btn-transform); letter-spacing:var(--sf-letter-spacing);">
        Proceed to Checkout →
      </a>
    </div>
  {/if}
</div>
