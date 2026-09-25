<script lang="ts">
  import { cart, cartDiscount } from '$lib/stores/cart';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { checkoutSchema } from '$lib/schemas/storefront';

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

  // Per-field inline validation errors
  let errors = $state<{ name: string; phone: string; email: string; address: string }>({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  function validateField(field: 'name' | 'phone' | 'email' | 'address') {
    // Build a partial body for the relevant field and parse with zod
    const partial = {
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      shippingAddress: address,
      items: [{ productId: 'x', title: 'x', slug: 'x', price: 1, quantity: 1 }]
    };
    const result = checkoutSchema.safeParse(partial);
    if (result.success) {
      errors[field] = '';
      return;
    }
    const fieldMap: Record<string, 'name' | 'phone' | 'email' | 'address'> = {
      customerName: 'name',
      customerPhone: 'phone',
      customerEmail: 'email',
      shippingAddress: 'address'
    };
    // Clear the specific field error first, then re-apply from zod
    errors[field] = '';
    for (const issue of result.error.issues) {
      const mapped = fieldMap[issue.path[0] as string];
      if (mapped === field) {
        errors[field] = issue.message;
        break;
      }
    }
  }

  function validateAll(): boolean {
    const partial = {
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      shippingAddress: address,
      items: [{ productId: 'x', title: 'x', slug: 'x', price: 1, quantity: 1 }]
    };
    const result = checkoutSchema.safeParse(partial);
    // Reset all errors
    errors = { name: '', phone: '', email: '', address: '' };
    if (result.success) return true;

    const fieldMap: Record<string, keyof typeof errors> = {
      customerName: 'name',
      customerPhone: 'phone',
      customerEmail: 'email',
      shippingAddress: 'address'
    };
    for (const issue of result.error.issues) {
      const mapped = fieldMap[issue.path[0] as string];
      if (mapped && !errors[mapped]) {
        errors[mapped] = issue.message;
      }
    }
    return false;
  }

  async function placeOrder() {
    if ($cart.length === 0) return;
    if (!validateAll()) return;

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

<div style="max-width:540px; margin:0 auto; padding:32px 24px;">
  <h1 style="font-size:1.75rem; font-weight:800; margin:0 0 32px; color:var(--sf-text);">Checkout</h1>

  <div>
    <!-- Customer form — novalidate so we handle validation ourselves -->
    <form novalidate onsubmit={(e) => { e.preventDefault(); placeOrder(); }}>
      <div style="border:1px solid var(--sf-border); border-radius:var(--sf-radius-lg); padding:24px; margin-bottom:24px; background:var(--sf-bg);">
        <h2 style="font-size:1.1rem; font-weight:700; margin:0 0 20px; color:var(--sf-text);">Contact &amp; Shipping</h2>

        <!-- Full Name -->
        <div style="margin-bottom:16px;">
          <label for="co-name" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Full Name *</label>
          <input
            id="co-name"
            bind:value={name}
            onblur={() => validateField('name')}
            placeholder="Your full name"
            aria-invalid={errors.name ? 'true' : undefined}
            style="width:100%; border:1px solid {errors.name ? 'var(--sf-error)' : 'var(--sf-border)'}; border-radius:var(--sf-radius); padding:10px 14px; font-size:0.9rem; box-sizing:border-box; background:var(--sf-bg); color:var(--sf-text);"
          />
          {#if errors.name}
            <p class="sf-field-error" style="font-size:0.8rem; color:var(--sf-error); margin:4px 0 0;">{errors.name}</p>
          {/if}
        </div>

        <!-- Phone Number -->
        <div style="margin-bottom:16px;">
          <label for="co-phone" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Phone Number *</label>
          <input
            id="co-phone"
            bind:value={phone}
            onblur={() => validateField('phone')}
            type="tel"
            placeholder="e.g. 03001234567"
            aria-invalid={errors.phone ? 'true' : undefined}
            style="width:100%; border:1px solid {errors.phone ? 'var(--sf-error)' : 'var(--sf-border)'}; border-radius:var(--sf-radius); padding:10px 14px; font-size:0.9rem; box-sizing:border-box; background:var(--sf-bg); color:var(--sf-text);"
          />
          {#if errors.phone}
            <p class="sf-field-error" style="font-size:0.8rem; color:var(--sf-error); margin:4px 0 0;">{errors.phone}</p>
          {/if}
        </div>

        <!-- Email Address -->
        <div style="margin-bottom:16px;">
          <label for="co-email" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Email Address *</label>
          <input
            id="co-email"
            bind:value={email}
            onblur={() => validateField('email')}
            type="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? 'true' : undefined}
            style="width:100%; border:1px solid {errors.email ? 'var(--sf-error)' : 'var(--sf-border)'}; border-radius:var(--sf-radius); padding:10px 14px; font-size:0.9rem; box-sizing:border-box; background:var(--sf-bg); color:var(--sf-text);"
          />
          {#if errors.email}
            <p class="sf-field-error" style="font-size:0.8rem; color:var(--sf-error); margin:4px 0 0;">{errors.email}</p>
          {/if}
        </div>

        <!-- Shipping Address -->
        <div style="margin-bottom:16px;">
          <label for="co-address" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Shipping Address *</label>
          <textarea
            id="co-address"
            bind:value={address}
            onblur={() => validateField('address')}
            rows="3"
            placeholder="Full shipping address including city"
            aria-invalid={errors.address ? 'true' : undefined}
            style="width:100%; border:1px solid {errors.address ? 'var(--sf-error)' : 'var(--sf-border)'}; border-radius:var(--sf-radius); padding:10px 14px; font-size:0.9rem; resize:vertical; box-sizing:border-box; background:var(--sf-bg); color:var(--sf-text);"
          ></textarea>
          {#if errors.address}
            <p class="sf-field-error" style="font-size:0.8rem; color:var(--sf-error); margin:4px 0 0;">{errors.address}</p>
          {/if}
        </div>

        <!-- Order Notes (optional) -->
        <div>
          <label for="co-notes" style="font-size:0.875rem; font-weight:600; color:var(--sf-text); display:block; margin-bottom:6px;">Order Notes (optional)</label>
          <textarea
            id="co-notes"
            bind:value={notes}
            rows="2"
            placeholder="Any special instructions…"
            style="width:100%; border:1px solid var(--sf-border); border-radius:var(--sf-radius); padding:10px 14px; font-size:0.9rem; resize:vertical; box-sizing:border-box; background:var(--sf-bg); color:var(--sf-text);"
          ></textarea>
        </div>
      </div>

      {#if errorMsg}
        <div style="background:var(--sf-error-tint); border:1px solid var(--sf-error); border-radius:var(--sf-radius); padding:12px 16px; color:var(--sf-error); font-size:0.875rem; margin-bottom:16px;">
          {errorMsg}
        </div>
      {/if}

      <button type="submit" disabled={submitting || $cart.length === 0}
        style="width:100%; padding:14px; background:var(--sf-primary); color:var(--sf-on-primary); border:none; border-radius:var(--sf-radius-lg); font-size:1rem; font-weight:var(--sf-btn-weight); text-transform:var(--sf-btn-transform); cursor:pointer; letter-spacing:var(--sf-letter-spacing);">
        {submitting ? 'Placing Order…' : 'Place Order'}
      </button>
    </form>

    <!-- Order summary -->
    <div style="background:var(--sf-surface); border-radius:var(--sf-radius-lg); padding:24px; border:1px solid var(--sf-border); margin-top:24px;">
      <h2 style="font-size:1.1rem; font-weight:700; margin:0 0 16px; color:var(--sf-text);">Order Summary</h2>
      {#each $cart as item}
        <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center;">
          <div style="width:48px; height:48px; border-radius:var(--sf-radius); overflow:hidden; background:var(--sf-border); flex-shrink:0;">
            {#if item.imageUrl}
              <img src={item.imageUrl} alt="" style="width:100%; height:100%; object-fit:cover;" />
            {:else}
              <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.25rem; color:var(--sf-muted);">📦</div>
            {/if}
          </div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:0.8rem; font-weight:600; color:var(--sf-text); margin:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">{item.title}</p>
            <p style="font-size:0.75rem; color:var(--sf-muted); margin:2px 0 0;">×{item.quantity}</p>
          </div>
          <span style="font-size:0.875rem; font-weight:600; white-space:nowrap; color:var(--sf-text);">Rs. {(item.price * item.quantity).toLocaleString()}</span>
        </div>
      {/each}
      <div style="border-top:1px solid var(--sf-border); margin-top:16px; padding-top:16px;">
        <div style="display:flex; justify-content:space-between; font-size:0.875rem; margin-bottom:6px;">
          <span style="color:var(--sf-muted);">Subtotal</span>
          <span style="color:var(--sf-text);">Rs. {subtotal.toLocaleString()}</span>
        </div>
        {#if $cartDiscount}
          <div style="display:flex; justify-content:space-between; font-size:0.875rem; color:var(--sf-success); margin-bottom:6px;">
            <span>Discount ({$cartDiscount.code})</span>
            <span>–Rs. {$cartDiscount.amount.toLocaleString()}</span>
          </div>
        {/if}
        <p style="font-size:0.7rem; color:var(--sf-muted); margin:4px 0 0;">Shipping &amp; tax calculated server-side</p>
      </div>
    </div>
  </div>
</div>

