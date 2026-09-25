<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Error {$page.status}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[var(--color-surface-2)] px-4">
  <div class="w-full max-w-[440px] text-center">
    <div class="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-10">
      <p class="text-6xl font-bold text-[var(--color-primary)] mb-2">{$page.status}</p>
      <p class="text-[var(--color-text)] text-base mb-6">
        {$page.error?.message ?? 'Something went wrong'}
      </p>
      <a
        href="/admin"
        class="inline-block bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Back to admin
      </a>
    </div>
  </div>
</div>
