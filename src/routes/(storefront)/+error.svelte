<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>{$page.status === 404 ? 'Store not found' : `Error ${$page.status}`}</title>
</svelte:head>

{#if $page.status === 404}
  <div style="min-height:60vh; display:flex; align-items:center; justify-content:center; font-family:var(--sf-font-body,inherit);">
    <div style="text-align:center; padding:40px 16px;">
      <h1 style="font-size:3rem; font-weight:700; color:var(--sf-primary,#0d6efd); margin:0 0 8px;">404</h1>
      <p style="font-size:1.1rem; color:var(--sf-text,#212529); margin:0 0 24px;">
        This store doesn't exist or is no longer active.
      </p>
      <a
        href="/"
        style="display:inline-block; background:var(--sf-primary,#0d6efd); color:var(--sf-on-primary,#fff); padding:10px 24px; border-radius:var(--sf-radius,6px); text-decoration:none; font-weight:600; font-size:0.9375rem;"
      >Browse VendWiz</a>
    </div>
  </div>
{:else}
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
{/if}
