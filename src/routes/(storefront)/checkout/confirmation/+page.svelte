<script lang="ts">
  import { page } from '$app/stores';
  import BankDetails from '$lib/components/storefront/BankDetails.svelte';
  import { isPaymentMethod, hasBankDetails } from '$lib/paymentInfo';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);
  let basePath = $derived(data.basePath ?? '');

  let orderRef = $derived($page.url.searchParams.get('ref') ?? '');
  // How the customer chose to pay (set by checkout); anything unknown is treated as cash on delivery
  let isBankTransfer = $derived.by(() => {
    const pay = $page.url.searchParams.get('pay');
    return isPaymentMethod(pay) && pay === 'bank_transfer' && hasBankDetails(store);
  });

  let copied = $state(false);
  async function copyRef() {
    if (!orderRef) return;
    let success = false;
    try {
      await navigator.clipboard.writeText(orderRef);
      success = true;
    } catch {
      // Fallback for non-secure contexts (e.g. HTTP on a LAN IP)
      const ta = document.createElement('textarea');
      ta.value = orderRef;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      success = document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (success) {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }

</script>

<svelte:head>
  <title>Order Confirmed | {store.name}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="confirm-wrap">
  <div style="width:80px; height:80px; background:#dcfce7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin:0 auto 24px;">
    ✓
  </div>

  <h1 style="font-size:1.75rem; font-weight:800; color:var(--sf-text); margin:0 0 12px;">Order Placed Successfully!</h1>
  {#if isBankTransfer}
    <p style="color:var(--sf-muted); margin:0 0 24px; line-height:1.6;">
      Thank you for your order! To proceed, please complete your bank transfer using the details below. We'll start processing your order as soon as we confirm your payment.
    </p>
  {:else}
    <p style="color:var(--sf-muted); margin:0 0 32px; line-height:1.6;">
      Thank you for your order! We are processing your order and will let you know when it ships. You'll pay in cash when it is delivered.
    </p>
  {/if}

  {#if orderRef}
    <div style="background:var(--sf-surface); border-radius:10px; padding:16px 24px; margin-bottom:32px; display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;">
      <span style="color:var(--sf-muted); font-size:0.875rem;">Order Reference:</span>
      <span style="font-size:1.25rem; font-weight:800; color:var(--sf-text); font-family:monospace; word-break:break-all;">#{orderRef}</span>
      <button onclick={copyRef} title="Copy reference"
        style="background:none; border:none; cursor:pointer; font-size:1rem; color:var(--sf-muted);">
        {copied ? '✓' : '📋'}
      </button>
    </div>
  {/if}

  {#if isBankTransfer}
    <div style="margin-bottom:32px;">
      <BankDetails {store} {orderRef} />
    </div>
  {/if}

  <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">

    <a href="{basePath}/track"
      style="padding:12px 28px; background:var(--sf-surface); color:var(--sf-text); border-radius:10px; text-decoration:none; font-weight:600; font-size:0.9rem;">
      Track Your Order
    </a>

    <a href="{basePath}/products"
      style="padding:12px 28px; background:var(--sf-primary); color:var(--sf-on-primary); border-radius:10px; text-decoration:none; font-weight:600; font-size:0.9rem;">
      Continue Shopping
    </a>
  </div>
</div>

<style>
  .confirm-wrap {
    max-width: 560px;
    margin: 0 auto;
    padding: 72px 24px 48px;
    text-align: center;
  }
</style>
