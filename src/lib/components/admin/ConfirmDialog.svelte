<script lang="ts">
  /**
   * Confirmation pop-up, styled like the admin's other dialogs (categories / products delete).
   * Use it instead of the browser's plain confirm().
   */
  let {
    open = false,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    onconfirm,
    oncancel
  }: {
    open?: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' makes the confirm button red (destructive actions) */
    variant?: 'primary' | 'danger';
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  let confirmButton = $state<HTMLButtonElement | null>(null);

  // Put keyboard focus on the dialog when it opens so Enter / Esc work straight away
  $effect(() => {
    if (open) confirmButton?.focus();
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      oncancel();
    }
  }
</script>

{#if open}
  <div
    class="cd-backdrop"
    role="presentation"
    onclick={oncancel}
    onkeydown={onKeydown}
  >
    <div
      class="cd-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cd-title"
      aria-describedby="cd-message"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeydown}
    >
      <div class="cd-header">
        <h2 id="cd-title">{title}</h2>
      </div>
      <div class="cd-body">
        <p id="cd-message">{message}</p>
      </div>
      <div class="cd-footer">
        <button type="button" class="btn btn-secondary" onclick={oncancel}>{cancelLabel}</button>
        <button
          type="button"
          bind:this={confirmButton}
          class="btn {variant === 'danger' ? 'btn-danger' : 'btn-primary'}"
          onclick={onconfirm}
        >{confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cd-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .cd-modal {
    background: #fff;
    border-radius: 10px;
    width: 380px;
    max-width: 95vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
  }
  .cd-header {
    padding: 1.25rem 1.5rem 0;
  }
  .cd-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
  .cd-body {
    padding: 1rem 1.5rem 1.25rem;
  }
  .cd-body p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--color-text-muted, #6b7280);
  }
  .cd-footer {
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid #f0f0f0;
  }
</style>
