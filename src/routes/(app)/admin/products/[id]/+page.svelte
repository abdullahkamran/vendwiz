<script lang="ts">
  import type { PageData } from './$types';
  import ProductForm from '$lib/components/admin/ProductForm.svelte';
  import type { Category } from '$lib/server/db/schema';

  let { data }: { data: PageData } = $props();

  let product = data.product;
  let categories = data.categories as Category[];

  type ImageRow = { id?: string; url: string; sortOrder: number };
  type VariantRow = {
    id?: string;
    name: string;
    options: { label: string; price_modifier: number }[];
  };
  type AttributeRow = { id?: string; name: string; value: string };

  const imageRows: ImageRow[] = (data.images as ImageRow[]).map((img) => ({
    id: img.id,
    url: img.url,
    sortOrder: img.sortOrder
  }));

  // DB variants use `label` (not `name`) and `optionValueIds` (not `options`)
  type RawVariant = typeof data.variants[number];
  const variantRows: VariantRow[] = data.variants.map((v: RawVariant) => ({
    id: v.id,
    name: v.label ?? '',
    options: []
  }));

  type RawAttr = { id?: string; name: string; value: string };
  const attributeRows: AttributeRow[] = (data.attributes as RawAttr[]).map((a) => ({
    id: a.id,
    name: a.name,
    value: a.value
  }));

  let saveMessage = $state('');

  async function handleSave(formData: Record<string, unknown>) {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? 'Failed to save product');
    }

    saveMessage = 'Saved!';
    setTimeout(() => (saveMessage = ''), 3000);
  }
</script>

<div class="page">
  <div class="page-header">
    <div class="breadcrumb">
      <a href="/admin/products">Products</a>
      <span>/</span>
      <span>{product.title}</span>
    </div>
    <div class="title-row">
      <h1>{product.title}</h1>
      {#if saveMessage}
        <span class="save-message">{saveMessage}</span>
      {/if}
    </div>
  </div>

  <ProductForm
    {product}
    {categories}
    images={imageRows}
    variants={variantRows}
    attributes={attributeRows}
    onSave={handleSave}
  />
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

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .save-message {
    font-size: 0.875rem;
    color: #137333;
    font-weight: 500;
    background: #e6f4ea;
    padding: 3px 10px;
    border-radius: 12px;
  }
</style>
