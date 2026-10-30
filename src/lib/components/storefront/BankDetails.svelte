<script lang="ts">
  import { bankDetailRows, type BankFields } from '$lib/paymentInfo';
  import { whatsappDigits } from '$lib/utils/phone';

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
  // Chat link with the order reference filled in, so the customer only has to attach the screenshot
  let whatsappUrl = $derived(
    whatsapp
      ? `https://wa.me/${whatsappDigits(whatsapp)}${orderRef ? `?text=${encodeURIComponent(`Payment for order #${orderRef}`)}` : ''}`
      : ''
  );

  // Account number and IBAN are what customers paste into their banking app
  const COPYABLE = new Set(['Account number', 'IBAN']);
  let copied = $state('');
  let copiedTimer: ReturnType<typeof setTimeout>;
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      copied = label;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copied = ''), 1800);
    } catch {
      window.prompt(`Copy the ${label.toLowerCase()}:`, value);
    }
  }
</script>

<div class="bd" class:bd--compact={compact}>
  <div class="bd-head">
    <span class="bd-icon" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>
      </svg>
    </span>
    <div>
      <p class="bd-title">Bank Transfer Details</p>
      <p class="bd-sub">Transfer the order total to this account</p>
    </div>
  </div>

  <dl class="bd-rows">
    {#each rows as row}
      <div class="bd-row">
        <dt>{row.label}</dt>
        <dd>
          <span class="bd-value" class:bd-value--mono={COPYABLE.has(row.label)}>{row.value}</span>
          {#if COPYABLE.has(row.label)}
            <button type="button" class="bd-copy" class:bd-copy--done={copied === row.label}
              onclick={() => copy(row.label, row.value)} aria-label="Copy {row.label.toLowerCase()}">
              {#if copied === row.label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17.5 19 7"/></svg>
                Copied
              {:else}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                Copy
              {/if}
            </button>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>

  <div class="bd-note">
    <svg class="bd-note-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.549 4.116 1.516 5.843L.057 23.428a.5.5 0 00.614.614l5.601-1.463A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.999-1.371l-.358-.213-3.716.971.991-3.625-.234-.372A9.796 9.796 0 012.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/>
    </svg>
    <p>
      After transferring, please send a screenshot of the payment to us on WhatsApp {#if whatsapp}
      at <a href={whatsappUrl} target="_blank" rel="noopener">{whatsapp}</a>{/if}{#if orderRef}, mentioning your order reference
      <strong>#{orderRef}</strong>{/if}, so we can confirm your payment and proceed with your order.
    </p>
  </div>
</div>

<style>
  .bd {
    text-align: left;
    background: var(--sf-surface, #f8f9fa);
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius-lg, 12px);
    padding: 20px;
    color: var(--sf-text, #212529);
  }
  .bd--compact { padding: 16px; }

  .bd-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .bd-icon {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--sf-primary, #0d6efd) 12%, transparent);
    color: var(--sf-primary, #0d6efd);
  }
  .bd-title { margin: 0; font-weight: 700; font-size: 0.9375rem; }
  .bd-sub { margin: 2px 0 0; font-size: 0.75rem; color: var(--sf-muted, #6c757d); }

  /* Label left, value right; each row separated by a hairline */
  .bd-rows {
    margin: 0;
    background: var(--sf-bg, #fff);
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 8px);
    overflow: hidden;
  }
  .bd-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 11px 14px;
    border-top: 1px solid var(--sf-border, #dee2e6);
  }
  .bd-row:first-child { border-top: none; }
  .bd-row dt { font-size: 0.8125rem; color: var(--sf-muted, #6c757d); }
  .bd-row dd {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    margin-left: auto;
  }
  .bd-value { font-size: 0.875rem; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
  .bd-value--mono { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
  .bd-copy {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: 9999px;
    background: var(--sf-surface, #f8f9fa);
    color: var(--sf-text, #212529);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .bd-copy:hover { border-color: var(--sf-text, #212529); }
  .bd-copy--done,
  .bd-copy--done:hover { border-color: var(--sf-success, #16a34a); color: var(--sf-success, #16a34a); }

  /* WhatsApp instruction */
  .bd-note {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: var(--sf-radius, 8px);
    background: color-mix(in srgb, #25d366 10%, transparent);
    border: 1px solid color-mix(in srgb, #25d366 35%, transparent);
  }
  .bd-note-icon { flex-shrink: 0; margin-top: 1px; color: #25d366; }
  .bd-note p { margin: 0; font-size: 0.8125rem; line-height: 1.55; color: var(--sf-text, #212529); }
  .bd-note a { color: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
  .bd-note strong { font-weight: 700; }
</style>
