<script lang="ts">
  let { children } = $props();
</script>

<div class="admin-shell">
  <nav class="admin-nav">
    <div class="nav-brand">
      <a href="/admin">VendWiz Admin</a>
    </div>
    <ul class="nav-links">
      <li><a href="/admin/categories">Categories</a></li>
      <li><a href="/admin/products">Products</a></li>
    </ul>
  </nav>
  <main class="admin-main">
    {@render children()}
  </main>
</div>

<style>
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--color-surface);
  }

  .admin-nav {
    width: 220px;
    background: #fff;
    border-right: 1px solid #e5e5e5;
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  .nav-brand a {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--color-text);
    text-decoration: none;
  }

  .nav-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .nav-links a {
    display: block;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    color: var(--color-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    transition: background 0.15s, color 0.15s;
  }

  .nav-links a:hover {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .admin-main {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }
</style>
