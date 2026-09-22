<script lang="ts">
  import { buildWhatsAppUrl } from '$lib/utils/whatsapp';

  let { data }: { data: import('./$types').PageData } = $props();
  let store = $derived(data.store);

  let name = $state('');
  let contact = $state(''); // email or phone
  let message = $state('');
  let waUrl = $state<string | null>(null);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const fullMessage =
      `Hi, I'm ${name}\n` +
      `Contact: ${contact}\n\n` +
      `Message:\n${message}`;
    // buildWhatsAppUrl handles null/empty phone gracefully (produces wa.me/?text=…)
    waUrl = buildWhatsAppUrl(store.whatsapp, fullMessage);
  }
</script>

<svelte:head>
  <title>Contact | {store.name}</title>
</svelte:head>

<div class="contact-page">
  <h1 class="contact-title">Contact Us</h1>
  <p class="contact-sub">Fill in the form below and we'll reach out on WhatsApp.</p>

  {#if !waUrl}
    <form class="contact-form" onsubmit={handleSubmit}>
      <div class="form-field">
        <label for="c-name">Your Name</label>
        <input id="c-name" type="text" bind:value={name} required placeholder="Jane Smith" />
      </div>

      <div class="form-field">
        <label for="c-contact">Email or Phone</label>
        <input id="c-contact" type="text" bind:value={contact} required placeholder="jane@example.com or +92 300 0000000" />
      </div>

      <div class="form-field">
        <label for="c-message">Message</label>
        <textarea id="c-message" bind:value={message} rows="5" required placeholder="How can we help you?"></textarea>
      </div>

      <button type="submit" class="btn-send" style="background:var(--sf-primary); color:var(--sf-on-primary); border-radius:var(--sf-radius);">
        💬 Send via WhatsApp
      </button>
    </form>
  {:else}
    <div class="contact-result">
      <p class="result-text">Your message is ready to send!</p>
      <a href={waUrl} target="_blank" rel="noopener" class="btn-wa" style="background:#25d366; color:#fff; border-radius:var(--sf-radius);">
        💬 Open WhatsApp to Send
      </a>
      <button class="btn-reset" onclick={() => (waUrl = null)}>Start Over</button>
    </div>
  {/if}

  {#if store.contactEmail}
    <p class="contact-alt">
      Or email us at <a href="mailto:{store.contactEmail}" style="color:var(--sf-primary);">{store.contactEmail}</a>
    </p>
  {/if}
</div>

<style>
  .contact-page {
    padding: 24px 0 48px;
    max-width: 480px;
    margin: 0 auto;
  }
  .contact-title {
    font-family: var(--sf-heading-font, system-ui);
    font-weight: var(--sf-heading-weight, 700);
    font-size: 1.75rem;
    color: var(--sf-text, #212529);
    margin: 0 0 8px;
  }
  .contact-sub {
    color: var(--sf-muted, #6c757d);
    font-size: 0.9375rem;
    margin: 0 0 24px;
  }
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sf-text, #374151);
  }
  .form-field input,
  .form-field textarea {
    width: 100%;
    border: 1px solid var(--sf-border, #dee2e6);
    border-radius: var(--sf-radius, 6px);
    padding: 10px 14px;
    font-size: 0.9375rem;
    font-family: inherit;
    background: var(--sf-bg, #fff);
    color: var(--sf-text, #212529);
  }
  .form-field textarea { resize: vertical; }
  .btn-send {
    padding: 13px;
    border: none;
    font-size: 1rem;
    font-weight: var(--sf-btn-weight, 600);
    cursor: pointer;
    width: 100%;
    text-transform: var(--sf-btn-transform, none);
  }
  .contact-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 0;
    text-align: center;
  }
  .result-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--sf-text, #212529);
    margin: 0;
  }
  .btn-wa {
    display: block;
    padding: 13px 28px;
    text-decoration: none;
    font-size: 1rem;
    font-weight: 700;
    width: 100%;
    text-align: center;
  }
  .btn-reset {
    background: none;
    border: none;
    color: var(--sf-muted, #6c757d);
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: underline;
  }
  .contact-alt {
    margin-top: 24px;
    font-size: 0.875rem;
    color: var(--sf-muted, #6c757d);
    text-align: center;
  }
</style>
