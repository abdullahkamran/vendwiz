<script lang="ts">
  import { whatsappDigits } from '$lib/utils/phone';

  // Floating WhatsApp button (bottom-right). Hover shows "Need help? Chat with us"; clicking opens
  // a small panel whose "Contact Us" card starts a WhatsApp chat with the store.
  let { phone, raised = false }: { phone: string; raised?: boolean } = $props();

  let open = $state(false);
  let root = $state<HTMLElement | null>(null);
  let chatUrl = $derived(`https://wa.me/${whatsappDigits(phone)}`);

  function onKey(e: KeyboardEvent) { if (e.key === 'Escape') open = false; }
  // Close on clicks outside. composedPath() still lists the button's icon even after the click
  // swapped it out of the DOM, which a contains() check would miss.
  function onDocClick(e: MouseEvent) {
    if (open && root && !e.composedPath().includes(root)) open = false;
  }
</script>

<svelte:window onkeydown={onKey} onclick={onDocClick} />

{#snippet waIcon(size: number)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.549 4.116 1.516 5.843L.057 23.428a.5.5 0 00.614.614l5.601-1.463A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.999-1.371l-.358-.213-3.716.971.991-3.625-.234-.372A9.796 9.796 0 012.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/>
  </svg>
{/snippet}

<div class="wa" class:wa--raised={raised} bind:this={root}>
  {#if open}
    <div class="wa-panel" role="dialog" aria-label="Start a conversation">
      <div class="wa-head">
        <p class="wa-title">Start a Conversation</p>
        <p class="wa-intro">Hi! Click one of our members below to chat on <strong>WhatsApp</strong></p>
        <button class="wa-close" onclick={() => (open = false)} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="wa-body">
        <p class="wa-note">The team typically replies in a few minutes.</p>
        <a href={chatUrl} target="_blank" rel="noopener" class="wa-member">
          <span class="wa-avatar">{@render waIcon(22)}</span>
          <span class="wa-member-text">
            <span class="wa-member-name">Contact Us</span>
            <span class="wa-member-role">Need Quick Help</span>
          </span>
          <span class="wa-member-go">{@render waIcon(18)}</span>
        </a>
      </div>
    </div>
  {/if}

  <button class="wa-fab" onclick={() => (open = !open)} aria-expanded={open}
    aria-label="Need help? Chat with us">
    {#if open}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
      </svg>
    {:else}
      {@render waIcon(28)}
    {/if}
    {#if !open}<span class="wa-tip" aria-hidden="true">Need help? <strong>Chat with us</strong></span>{/if}
  </button>
</div>

<style>
  .wa {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 45; /* above page content and the bottom nav (30), below drawers (50+) */
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 14px;
  }
  /* Mobile: sit above the fixed bottom nav */
  .wa--raised { right: 16px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }

  .wa-fab {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: #25d366;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.35), 0 2px 6px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .wa-fab:hover { transform: scale(1.06); }

  /* "Need help? Chat with us" bubble to the left of the button, on hover / keyboard focus */
  .wa-tip {
    position: absolute;
    right: calc(100% + 12px);
    top: 50%;
    transform: translate(8px, -50%);
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    padding: 8px 14px;
    border-radius: 9999px;
    background: #fff;
    color: #1f2937;
    font-size: 0.8125rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .wa-fab:hover .wa-tip,
  .wa-fab:focus-visible .wa-tip { opacity: 1; transform: translate(0, -50%); }

  .wa-panel {
    width: min(340px, calc(100vw - 32px));
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
    color: #1f2937;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
    animation: wa-pop 0.22s ease-out;
  }
  @keyframes wa-pop {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: none; }
  }
  .wa-head {
    position: relative;
    padding: 20px 48px 20px 20px;
    background: #25d366;
    color: #fff;
  }
  .wa-title { margin: 0 0 6px; font-size: 1.0625rem; font-weight: 700; }
  .wa-intro { margin: 0; font-size: 0.8125rem; line-height: 1.5; opacity: 0.95; }
  .wa-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 255, 255, 0.18);
    border: none;
    color: #fff;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .wa-body { padding: 16px; }
  .wa-note { margin: 0 0 12px; font-size: 0.75rem; color: #6b7280; }
  .wa-member {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 10px;
    border-left: 3px solid #25d366;
    background: #f7f7f7;
    color: inherit;
    text-decoration: none;
    transition: background-color 0.15s ease;
  }
  .wa-member:hover { background: #eefaf2; }
  .wa-avatar {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #25d366;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .wa-member-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .wa-member-name { font-weight: 700; font-size: 0.9375rem; }
  .wa-member-role { font-size: 0.75rem; color: #6b7280; }
  .wa-member-go { color: #25d366; display: flex; }

  @media (prefers-reduced-motion: reduce) {
    .wa-panel { animation: none; }
  }
</style>
