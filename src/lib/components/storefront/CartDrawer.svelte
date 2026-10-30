<script lang="ts">
  import { mediaUrl } from '$lib/media';
  import { cart, MAX_CART_QTY, type CartItem } from '$lib/stores/cart';
  import { cartDrawerOpen } from '$lib/stores/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { basePath, currencySymbol }: { basePath: string; currencySymbol: string } = $props();

  let subtotal = $derived($cart.reduce((sum, i) => sum + i.price * i.quantity, 0));
  let itemCount = $derived($cart.reduce((sum, i) => sum + i.quantity, 0));

  function close() { cartDrawerOpen.set(false); }
  function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && $cartDrawerOpen) close(); }

  // Close whenever the page changes (e.g. a product link inside the panel)
  let href = $derived($page.url.href);
  $effect(() => {
    void href;
    cartDrawerOpen.set(false);
  });

  // Same stock check as the cart page's "Proceed to Checkout"
  type StockIssue = { productId: string; variantSelections?: Record<string, string>; message: string };
  let checking = $state(false);
  let issues = $state<StockIssue[]>([]);
  let checkError = $state('');
  const lineKey = (productId: string, sel?: Record<string, string>) => `${productId}_${JSON.stringify(sel ?? {})}`;
  function issueFor(item: CartItem) {
    return issues.find((i) => lineKey(i.productId, i.variantSelections) === lineKey(item.productId, item.variantSelections));
  }
  // A quantity change may resolve an earlier warning
  $effect(() => {
    $cart;
    issues = [];
  });

  async function checkout() {
    if (checking) return;
    checking = true;
    checkError = '';
    try {
      const res = await fetch(`${basePath}/api/storefront/cart-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: $cart.map((i) => ({ productId: i.productId, quantity: i.quantity, variantSelections: i.variantSelections }))
        })
      });
      if (!res.ok) throw new Error('check failed');
      const result = await res.json();
      issues = result.issues ?? [];
      if (result.ok) await goto(`${basePath}/checkout`);
    } catch {
      checkError = 'Could not verify stock right now. Please try again.';
    } finally {
      checking = false;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if $cartDrawerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="cd-overlay" onclick={close}></div>
{/if}

<aside class="cd" class:cd--open={$cartDrawerOpen} aria-label="Shopping cart" aria-hidden={!$cartDrawerOpen} inert={!$cartDrawerOpen}>
  <header class="cd-head">
    <h2 class="cd-title">Your Cart <span class="cd-count">({itemCount})</span></h2>
    <button class="cd-close" onclick={close} aria-label="Close cart">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
      </svg>
    </button>
  </header>

  {#if $cart.length === 0}
    <div class="cd-empty">
      <p>Your cart is empty.</p>
      <button class="cd-btn cd-btn--primary" onclick={close}>Continue Shopping</button>
    </div>
  {:else}
    <ul class="cd-items">
      {#each $cart as item (lineKey(item.productId, item.variantSelections))}
        {@const issue = issueFor(item)}
        <li class="cd-item">
          <a href="{basePath}/products/{item.slug}" class="cd-thumb">
            {#if item.imageUrl}
              <img src={mediaUrl(item.imageUrl)} alt={item.title} />
            {:else}
              <span aria-hidden="true">📦</span>
            {/if}
          </a>
          <div class="cd-info">
            <a href="{basePath}/products/{item.slug}" class="cd-name">{item.title}</a>
            {#if item.variantSelections && Object.keys(item.variantSelections).length > 0}
              <p class="cd-variant">{Object.entries(item.variantSelections).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
            {/if}
            <p class="cd-price">{currencySymbol} {(item.price * item.quantity).toLocaleString()}</p>
            <div class="cd-row">
              <div class="cd-stepper">
                <button onclick={() => cart.updateQuantity(item.productId, item.quantity - 1, item.variantSelections)}
                  disabled={item.quantity <= 1} aria-label="Decrease quantity">−</button>
                <span>{item.quantity}</span>
                <button onclick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.variantSelections)}
                  disabled={item.quantity >= MAX_CART_QTY} aria-label="Increase quantity">+</button>
              </div>
              <button class="cd-remove" onclick={() => cart.removeItem(item.productId, item.variantSelections)}>Remove</button>
            </div>
            {#if issue}<p class="cd-issue" role="alert">{issue.message}</p>{/if}
          </div>
        </li>
      {/each}
    </ul>

    <footer class="cd-foot">
      <div class="cd-subtotal">
        <span>Subtotal</span>
        <strong>{currencySymbol} {subtotal.toLocaleString()}</strong>
      </div>
      <p class="cd-note">Shipping, taxes and discounts are calculated at checkout.</p>
      {#if checkError}<p class="cd-issue" role="alert">{checkError}</p>{/if}
      <button class="cd-btn cd-btn--primary" onclick={checkout} disabled={checking}>
        {checking ? 'Checking stock…' : 'Checkout'}
      </button>
      <a href="{basePath}/cart" class="cd-btn cd-btn--outline">View Cart</a>
      <button class="cd-continue" onclick={close}>Continue Shopping</button>
    </footer>
  {/if}
</aside>

<style>
  .cd-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: var(--sf-overlay, rgba(0, 0, 0, 0.45));
  }
  .cd {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 71;
    width: min(400px, 92vw);
    display: flex;
    flex-direction: column;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
    transform: translateX(100%);
    visibility: hidden;
    transition: transform 0.3s ease, visibility 0.3s;
  }
  .cd--open { transform: translateX(0); visibility: visible; }

  .cd-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .cd-title {
    margin: 0;
    font-family: var(--sf-heading-font, system-ui);
    font-size: 1.125rem;
    font-weight: var(--sf-heading-weight, 700);
  }
  .cd-count { color: var(--sf-muted, #6c757d); font-weight: 500; font-size: 0.9375rem; }
  .cd-close {
    background: none;
    border: none;
    color: var(--sf-text, #212529);
    cursor: pointer;
    padding: 6px;
    display: flex;
    border-radius: 50%;
  }
  .cd-close:hover { background: var(--sf-surface, #f8f9fa); }

  .cd-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    color: var(--sf-muted, #6c757d);
  }

  .cd-items {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 4px 20px;
  }
  .cd-item {
    display: flex;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid var(--sf-border, #dee2e6);
  }
  .cd-item:last-child { border-bottom: none; }
  .cd-thumb {
    width: 76px;
    height: 88px;
    flex-shrink: 0;
    border-radius: var(--sf-radius, 6px);
    overflow: hidden;
    background: var(--sf-surface, #f8f9fa);
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  .cd-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .cd-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .cd-name {
    color: var(--sf-text, #212529);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.35;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .cd-name:hover { color: var(--sf-primary, #0d6efd); }
  .cd-variant { margin: 0; font-size: 0.75rem; color: var(--sf-muted, #6c757d); }
  .cd-price { margin: 0; font-weight: 700; font-size: 0.875rem; color: var(--sf-primary, #0d6efd); }
  .cd-row { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
  .cd-stepper {
    display: flex;
    align-items: center;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    overflow: hidden;
  }
  .cd-stepper button {
    width: 30px;
    height: 30px;
    border: none;
    background: var(--sf-surface, #f8f9fa);
    color: var(--sf-text, #212529);
    cursor: pointer;
    font-size: 1rem;
  }
  .cd-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
  .cd-stepper span { min-width: 32px; text-align: center; font-size: 0.875rem; font-weight: 600; }
  .cd-remove {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--sf-muted, #6c757d);
    text-decoration: underline;
  }
  .cd-remove:hover { color: var(--sf-error, #dc2626); }
  .cd-issue { margin: 4px 0 0; font-size: 0.75rem; font-weight: 600; color: var(--sf-error, #dc2626); }

  .cd-foot {
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--sf-border, #dee2e6);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--sf-surface, #f8f9fa);
  }
  .cd-subtotal { display: flex; justify-content: space-between; align-items: baseline; font-size: 1rem; }
  .cd-note { margin: 0; font-size: 0.75rem; color: var(--sf-muted, #6c757d); }
  .cd-btn {
    display: block;
    width: 100%;
    padding: 13px;
    text-align: center;
    text-decoration: none;
    font: inherit;
    font-size: 0.9375rem;
    font-weight: var(--sf-btn-weight, 600);
    text-transform: var(--sf-btn-transform, none);
    border-radius: var(--sf-radius, 6px);
    cursor: pointer;
  }
  .cd-btn--primary {
    background: var(--sf-primary, #0d6efd);
    color: var(--sf-on-primary, #fff);
    border: 2px solid var(--sf-primary, #0d6efd);
  }
  .cd-btn--primary:disabled { opacity: 0.6; cursor: wait; }
  .cd-btn--outline {
    background: transparent;
    color: var(--sf-text, #212529);
    border: 2px solid var(--sf-border, #dee2e6);
  }
  .cd-btn--outline:hover { border-color: var(--sf-text, #212529); }
  .cd-empty .cd-btn { width: auto; padding-inline: 28px; }
  .cd-continue {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    color: var(--sf-muted, #6c757d);
    text-decoration: underline;
  }
  .cd-continue:hover { color: var(--sf-text, #212529); }
</style>
