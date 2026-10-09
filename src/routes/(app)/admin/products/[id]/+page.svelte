<script lang="ts">
  import type { PageData } from './$types';
  import ProductForm from '$lib/components/admin/ProductForm.svelte';
  import type { Category } from '$lib/server/db/schema';

  let { data }: { data: PageData } = $props();

  let product = data.product;
  let categories = data.categories as Category[];

  type ImageRow = { id?: string; url: string; sortOrder: number };
  type VariantOption = { label: string; price_modifier: number; stockQty?: number; colorHex?: string };
  type VariantRow = {
    id?: string;
    name: string;
    options: VariantOption[];
    sizeChartUrl?: string;
  };
  type AttributeRow = { id?: string; name: string; value: string };

  const imageRows: ImageRow[] = (data.images as ImageRow[]).map((img) => ({
    id: img.id,
    url: img.url,
    sortOrder: img.sortOrder
  }));

  // Reconstruct variant rows from optionGroups (new format) when available,
  // falling back to the legacy DB variants shape for products saved before this change.
  type RawOptionGroup = { id: string; name: string; sortOrder: number; values: { id: string; value: string; sortOrder: number }[] };
  type RawVariant = typeof data.variants[number];

  const optionGroups: RawOptionGroup[] = (data as Record<string, unknown>).optionGroups as RawOptionGroup[] ?? [];

  const variantRows: VariantRow[] = (() => {
    if (optionGroups.length > 0) {
      const basePrice = Number(data.product.basePrice ?? 0);
      return optionGroups.map((g) => {
        const isColor = /colou?r/i.test(g.name);
        return {
          name: g.name,
          options: g.values.map((val) => {
            // Find the matching productVariant row (optionValueIds includes val.id)
            const matchedVariant = data.variants.find((v: RawVariant) => {
              const ids = v.optionValueIds as string[];
              return Array.isArray(ids) && ids.includes(val.id);
            });
            const variantPrice = matchedVariant?.price != null ? Number(matchedVariant.price) : null;
            const priceModifier = variantPrice != null ? variantPrice - basePrice : 0;
            return {
              label: val.value,
              price_modifier: priceModifier,
              stockQty: matchedVariant?.stockQty ?? 0,
              ...(isColor ? { colorHex: val.value.startsWith('#') ? val.value : undefined } : {})
            } satisfies VariantOption;
          }),
          sizeChartUrl: g.values.length > 0
            ? (data.variants.find((v: RawVariant) => {
                const ids = v.optionValueIds as string[];
                return Array.isArray(ids) && ids.includes(g.values[0].id);
              })?.sizeChartUrl ?? '')
            : ''
        };
      });
    }
    // Legacy fallback: reconstruct from flat productVariants rows
    return data.variants.map((v: RawVariant) => ({
      id: v.id,
      name: v.label ?? '',
      options: [{ label: v.label ?? '', price_modifier: 0, stockQty: v.stockQty ?? 0 }],
      sizeChartUrl: v.sizeChartUrl ?? ''
    }));
  })();

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
