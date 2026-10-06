<script lang="ts">
  import { cart, cartDiscount } from '$lib/stores/cart';
  import { onMount } from 'svelte';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');

  let discountCode = $state('');
  let discountMsg = $state('');
  let discountLoading = $state(false);
  let shippingFee = $state(0);
  let taxRate = $state(0);
  let freeShippingThreshold = $state<number | null>(null);

  onMount(async () => {
    try {
      const res = await fetch(`${basePath}/api/storefront/shipping-config`);
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
      const res = await fetch(`${basePath}/api/storefront/discount?code=${encodeURIComponent(discountCode.trim())}`);
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
        discountMsg = `Discount applied: –${store.currencySymbol} ${discAmt.toLocaleString()}`;
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
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="cart-page">
  <h1 class="cart-title">Your Cart</h1>

  {#if $cart.length === 0}
    <!-- Empty state -->
    <div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <p class="cart-empty-text">Your cart is empty.</p>
      <a href="{basePath}/products" class="cart-empty-cta"
        style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-pill); font-weight:var(--sf-btn-weight); text-transform:var(--sf-btn-transform); letter-spacing:var(--sf-letter-spacing);">
        Continue Shopping
      </a>
    </div>
  {:else}
    <!-- Two-column on desktop: items left, summary right -->
    <div class="cart-cols">
      <!-- Items column -->
      <div class="cart-items-col">
        {#each $cart as item}
          <div class="cart-item">
            <!-- Thumb: 72 × 82 -->
            <div class="cart-item-thumb">
              {#if item.imageUrl}
                <img src={item.imageUrl} alt={item.title} class="cart-item-img" />
              {:else}
                <div class="cart-item-ph">📦</div>
              {/if}
            </div>

            <!-- Details -->
            <div class="cart-item-details">
              <a href="{basePath}/products/{item.slug}" class="cart-item-title">{item.title}</a>
              {#if item.variantSelections && Object.keys(item.variantSelections).length > 0}
                <p class="cart-item-variant">
                  {Object.entries(item.variantSelections).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </p>
              {/if}
              <p class="cart-item-price" style="color:var(--sf-primary);">
                {store.currencySymbol} {(item.price * item.quantity).toLocaleString()}
              </p>
              {#if item.quantity > 1}
                <p class="cart-item-unit">{store.currencySymbol} {item.price.toLocaleString()} each</p>
              {/if}
            </div>

            <!-- Qty stepper + remove -->
            <div class="cart-item-actions">
              <div class="cart-qty">
                <button
                  onclick={() => cart.updateQuantity(item.productId, item.quantity - 1, item.variantSelections)}
                  class="cart-qty-btn">−</button>
                <span class="cart-qty-val">{item.quantity}</span>
                <button
                  onclick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.variantSelections)}
                  class="cart-qty-btn">+</button>
              </div>
              <button
                onclick={() => cart.removeItem(item.productId, item.variantSelections)}
                class="cart-remove">✕ Remove</button>
            </div>
          </div>
        {/each}

        <!-- Continue shopping -->
        <div class="cart-continue">
          <a href="{basePath}/products" class="cart-continue-link">← Continue Shopping</a>
        </div>
      </div><!-- .cart-items-col -->

      <!-- Order summary column (sticky on desktop) -->
      <div class="cart-summary-col">
        <div class="cart-summary-box">
          <h2 class="cart-summary-title">Order Summary</h2>

          <!-- Discount code input / applied chip -->
          {#if $cartDiscount}
            <div class="cart-discount-applied">
              <span class="cart-discount-code" style="color:var(--sf-success);">🎫 {$cartDiscount.code}</span>
              <button onclick={removeDiscount} class="cart-discount-remove" style="color:var(--sf-error);">Remove</button>
            </div>
          {:else}
            <div class="cart-discount-input-wrap">
              <div class="cart-discount-row">
                <input
                  bind:value={discountCode}
                  placeholder="Discount code"
                  class="cart-discount-input"
                  style="background:var(--sf-bg); color:var(--sf-text);"
                />
                <button
                  onclick={applyDiscount}
                  disabled={discountLoading}
                  class="cart-discount-btn"
                  style="color:var(--sf-primary); border-color:var(--sf-primary); background:var(--sf-surface);">
                  {discountLoading ? '…' : 'Apply'}
                </button>
              </div>
              {#if discountMsg}
                <p class="cart-discount-msg"
                  style="color:{discountMsg.includes('applied') ? 'var(--sf-success)' : 'var(--sf-error)'};">
                  {discountMsg}
                </p>
              {/if}
            </div>
          {/if}

          <!-- Line items -->
          <div class="cart-summary-lines">
            <div class="cart-summary-line">
              <span class="cart-line-label">Subtotal</span>
              <span class="cart-line-val">{store.currencySymbol} {subtotal.toLocaleString()}</span>
            </div>
            {#if discountAmount > 0}
              <div class="cart-summary-line" style="color:var(--sf-success);">
                <span>Discount</span>
                <span>–{store.currencySymbol} {discountAmount.toLocaleString()}</span>
              </div>
            {/if}
            <div class="cart-summary-line">
              <span class="cart-line-label">
                Shipping
                {#if freeShippingThreshold !== null && subtotal < freeShippingThreshold}
                  <span class="cart-free-hint">Free over {store.currencySymbol} {freeShippingThreshold.toLocaleString()}</span>
                {/if}
              </span>
              <span class="cart-line-val">{effectiveShipping === 0 ? 'Free' : `${store.currencySymbol} ${effectiveShipping.toLocaleString()}`}</span>
            </div>
            {#if taxAmount > 0}
              <div class="cart-summary-line">
                <span class="cart-line-label">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span class="cart-line-val">{store.currencySymbol} {taxAmount.toLocaleString()}</span>
              </div>
            {/if}
          </div>

          <!-- Total -->
          <div class="cart-total">
            <span>Total</span>
            <span>{store.currencySymbol} {Math.max(0, total).toLocaleString()}</span>
          </div>

          <!-- CTA -->
          <a href="{basePath}/checkout" class="cart-checkout-btn"
            style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-pill); font-weight:var(--sf-btn-weight); text-transform:var(--sf-btn-transform); letter-spacing:var(--sf-letter-spacing);">
            Proceed to Checkout →
          </a>
        </div>
      </div><!-- .cart-summary-col -->
    </div><!-- .cart-cols -->
  {/if}
</div>

<style>
  .cart-page {
    padding: 16px 0;
  }
  .cart-title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 24px;
    color: var(--sf-text);
  }

  /* ── Empty state ── */
  .cart-empty {
    text-align: center;
    padding: 64px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .cart-empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 2px dashed var(--sf-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--sf-muted);
  }
  .cart-empty-text { font-size: 1rem; color: var(--sf-muted); margin: 0; }
  .cart-empty-cta {
    padding: 10px 24px;
    text-decoration: none;
    font-size: 0.9rem;
    display: inline-block;
  }

  /* ── Two-col layout: stacked mobile, grid desktop ── */
  .cart-cols {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  @media (min-width: 1024px) {
    .cart-cols {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 48px;
      align-items: start;
    }
    .cart-summary-col {
      position: sticky;
      top: 96px;
    }
  }

  /* ── Cart item row ── */
  .cart-item {
    display: flex;
    gap: 12px;
    padding: 16px 0;
    border-top: 1px solid var(--sf-border);
    align-items: flex-start;
  }
  .cart-item-thumb {
    width: 72px;
    height: 82px;
    flex-shrink: 0;
    border-radius: var(--sf-radius);
    overflow: hidden;
    background: var(--sf-surface);
  }
  .cart-item-img { width: 100%; height: 100%; object-fit: cover; }
  .cart-item-ph {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    color: var(--sf-muted);
  }
  .cart-item-details { flex: 1; min-width: 0; }
  .cart-item-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sf-text);
    text-decoration: none;
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .cart-item-variant { font-size: 0.75rem; color: var(--sf-muted); margin: 3px 0 0; }
  .cart-item-price { font-size: 0.875rem; font-weight: 700; margin: 6px 0 0; }
  .cart-item-unit { font-size: 0.75rem; color: var(--sf-muted); margin: 2px 0 0; }
  .cart-item-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .cart-qty {
    display: flex;
    align-items: center;
    border: 1px solid var(--sf-border);
    border-radius: var(--sf-radius);
    overflow: hidden;
  }
  .cart-qty-btn {
    width: 30px;
    height: 30px;
    border: none;
    background: var(--sf-surface);
    cursor: pointer;
    color: var(--sf-text);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cart-qty-val {
    width: 32px;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sf-text);
  }
  .cart-remove {
    font-size: 0.75rem;
    color: var(--sf-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  /* ── Continue shopping ── */
  .cart-continue {
    padding: 16px 0;
    border-top: 1px solid var(--sf-border);
  }
  .cart-continue-link { color: var(--sf-muted); font-size: 0.875rem; text-decoration: none; }

  /* ── Order summary box ── */
  .cart-summary-box {
    background: var(--sf-surface);
    border-radius: var(--sf-radius-lg);
    padding: 20px;
    border: 1px solid var(--sf-border);
  }
  .cart-summary-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 16px;
    color: var(--sf-text);
  }
  .cart-discount-applied {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    background: var(--sf-success-tint);
    border: 1px solid var(--sf-success);
    border-radius: var(--sf-radius);
    padding: 10px 14px;
  }
  .cart-discount-code { font-size: 0.8rem; font-weight: 600; }
  .cart-discount-remove { background: none; border: none; cursor: pointer; font-size: 0.75rem; }
  .cart-discount-input-wrap { margin-bottom: 16px; }
  .cart-discount-row { display: flex; gap: 8px; }
  .cart-discount-input {
    flex: 1;
    border: 1px solid var(--sf-border);
    border-radius: var(--sf-radius);
    padding: 8px 12px;
    font-size: 0.8rem;
  }
  .cart-discount-btn {
    padding: 8px 14px;
    border: 1px solid;
    border-radius: var(--sf-radius);
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    font-weight: 600;
  }
  .cart-discount-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cart-discount-msg { font-size: 0.75rem; margin: 6px 0 0; }
  .cart-summary-lines {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 0.875rem;
  }
  .cart-summary-line { display: flex; justify-content: space-between; }
  .cart-line-label { color: var(--sf-muted); }
  .cart-line-val { color: var(--sf-text); }
  .cart-free-hint { font-size: 0.7rem; display: block; color: var(--sf-muted); }
  .cart-total {
    border-top: 1px solid var(--sf-border);
    margin: 16px 0 0;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 1rem;
    color: var(--sf-text);
  }
  .cart-checkout-btn {
    display: block;
    width: 100%;
    padding: 14px;
    text-decoration: none;
    text-align: center;
    font-size: 1rem;
    box-sizing: border-box;
    margin-top: 16px;
  }
</style>
