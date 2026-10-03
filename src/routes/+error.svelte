<script lang="ts">
  import { page } from '$app/stores';

  // Detect a path-based storefront access that produced a 404 (store row missing).
  // $page.url.pathname is the original request URL (e.g. /store/nonexistent),
  // regardless of SvelteKit's internal reroute to /.
  $: isStorefront404 =
    $page.status === 404 && $page.url.pathname.startsWith('/store/');
</script>

<svelte:head>
  <title>{isStorefront404 ? 'Store not found' : `Error ${$page.status}`}</title>
</svelte:head>

{#if isStorefront404}
  <div style="min-height:60vh; display:flex; align-items:center; justify-content:center;">
    <div style="text-align:center; padding:40px 16px; font-family:system-ui,sans-serif;">
      <h1 style="font-size:3rem; font-weight:700; color:#0d6efd; margin:0 0 8px;">404</h1>
      <p style="font-size:1.1rem; color:#212529; margin:0 0 24px;">
        This store doesn't exist or is no longer active.
      </p>
      <a
        href="/"
        style="display:inline-block; background:#0d6efd; color:#fff; padding:10px 24px; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.9375rem;"
      >Browse VendWiz</a>
    </div>
  </div>
{:else}
  <div style="min-height:60vh; display:flex; align-items:center; justify-content:center;">
    <div style="text-align:center; padding:40px 16px; font-family:system-ui,sans-serif;">
      <h1 style="font-size:3rem; font-weight:700; color:#0d6efd; margin:0 0 8px;">
        {$page.status}
      </h1>
      <p style="font-size:1.1rem; color:#212529; margin:0 0 24px;">
        {$page.error?.message ?? 'Something went wrong'}
      </p>
      <a
        href="/"
        style="display:inline-block; background:#0d6efd; color:#fff; padding:10px 24px; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.9375rem;"
      >Go home</a>
    </div>
  </div>
{/if}
