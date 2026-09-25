<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Error {$page.status}</title>
</svelte:head>

<div class="sf-main" style="min-height:60vh; display:flex; align-items:center; justify-content:center;">
  <div class="sf-container" style="text-align:center; padding:40px 16px;">
    <h1 style="font-size:3rem; font-weight:700; color:var(--sf-primary,#0d6efd); margin:0 0 8px;">
      {$page.status}
    </h1>
    <p style="font-size:1.1rem; color:var(--sf-text,#212529); margin:0 0 24px;">
      {$page.error?.message ?? 'Something went wrong'}
    </p>
    <a
      href="/"
      style="display:inline-block; background:var(--sf-primary,#0d6efd); color:var(--sf-on-primary,#fff); padding:10px 24px; border-radius:var(--sf-radius,6px); text-decoration:none; font-weight:600; font-size:0.9375rem;"
    >
      Back to home
    </a>
  </div>
</div>
