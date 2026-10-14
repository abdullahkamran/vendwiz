<script lang="ts">
  import { bankDetailRows, type BankFields } from '$lib/paymentInfo';

  let {
    store,
    orderRef = '',
    compact = false
  }: {
    /** The store whose bank details (and WhatsApp number) are shown */
    store: BankFields & { whatsapp?: string | null };
    /** Shown in the instructions on the order-placed page */
    orderRef?: string;
    /** Tighter spacing for the checkout page */
    compact?: boolean;
  } = $props();

  let rows = $derived(bankDetailRows(store));
  let whatsapp = $derived(store.whatsapp?.trim() ?? '');
</script>

<div
  style="background:var(--sf-surface); border:1px solid var(--sf-border); border-radius:var(--sf-radius-lg); padding:{compact ? '14px 16px' : '18px 20px'}; text-align:left;"
>
  <p style="margin:0 0 10px; font-weight:700; color:var(--sf-text); font-size:0.9rem;">Bank transfer details</p>
  <dl style="margin:0; display:grid; grid-template-columns:auto 1fr; gap:6px 16px; font-size:0.875rem;">
    {#each rows as row}
      <dt style="color:var(--sf-muted);">{row.label}</dt>
      <dd style="margin:0; color:var(--sf-text); font-weight:600; word-break:break-all;">{row.value}</dd>
    {/each}
  </dl>
  <p style="margin:12px 0 0; font-size:0.8125rem; line-height:1.55; color:var(--sf-muted);">
    After transferring, please send a screenshot of the payment to us on WhatsApp{#if whatsapp}
    at <strong style="color:var(--sf-text);">{whatsapp}</strong>{/if}{#if orderRef}, mentioning your order reference
    <strong style="color:var(--sf-text);">#{orderRef}</strong>{/if}, so we can confirm your payment and proceed with your order.
  </p>
</div>
