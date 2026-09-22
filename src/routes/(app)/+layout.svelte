<script lang="ts">
  let { children }: { children: any } = $props();
</script>

<!--
  Inject the "basic" theme CSS custom properties for all (app) routes:
  login, register, onboarding, and admin.
  These are the --sf-* tokens mapped to the basic/neutral palette used
  on single-column auth pages (AC-15) and admin (AC-16/17).
-->
<svelte:head>
  {@html `<style>
    :root {
      --sf-bg: #ffffff;
      --sf-surface: #f8f9fa;
      --sf-text: #212529;
      --sf-muted: #6c757d;
      --sf-border: #dee2e6;
      --sf-primary: #0d6efd;
      --sf-on-primary: #ffffff;
      --sf-radius: 6px;
      --sf-radius-lg: 12px;
      --sf-pill: 9999px;
      --sf-font: system-ui, -apple-system, sans-serif;
      --sf-heading-font: system-ui, -apple-system, sans-serif;
      --sf-heading-weight: 700;
      --sf-letter-spacing: 0em;
      --sf-card-shadow: 0 1px 4px rgba(0,0,0,0.08);
      --sf-card-border: 1px solid #dee2e6;
      --sf-btn-transform: none;
      --sf-btn-weight: 600;
      --sf-announce-bg: #1a1a2e;
      --sf-announce-text: #ffffff;
    }
  </style>`}
</svelte:head>

{@render children()}
