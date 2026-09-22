<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import ProductForm from '$lib/components/admin/ProductForm.svelte';
  import type { Category } from '$lib/server/db/schema';

  let { data }: { data: PageData } = $props();
  let categories = data.categories as Category[];

  async function handleSave(formData: Record<string, unknown>) {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? 'Failed to create product');
    }

    const created = await res.json();
    await goto(`/admin/products/${created.id}`);
  }
</script>

<div class="page">
  <div class="page-header">
    <div class="breadcrumb">
      <a href="/admin/products">Products</a>
      <span>/</span>
      <span>New Product</span>
    </div>
    <h1>New Product</h1>
  </div>

  <ProductForm {categories} onSave={handleSave} />
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 900px;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--color-secondary);
  }

  .breadcrumb a {
    color: var(--color-accent);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }
</style>
