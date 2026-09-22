<script lang="ts">
  import type { Category } from '$lib/server/db/schema';
  import ImageUploader from './ImageUploader.svelte';
  import VariantsEditor from './VariantsEditor.svelte';
  import AttributesTable from './AttributesTable.svelte';
  import { slugify } from '$lib/utils/slug';

  type ImageRow = { id?: string; url: string; sortOrder: number };
  type VariantRow = { id?: string; name: string; options: { label: string; price_modifier: number }[] };
  type AttributeRow = { id?: string; name: string; value: string };

  type ProductData = {
    id?: string;
    title: string;
    slug: string;
    categoryId: string | null;
    basePrice: string | number;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    youtubeUrl: string | null;
    isPublished: boolean;
    stockQty: number;
    lowStockThreshold: number;
  };

  let {
    product = null,
    categories = [],
    images: initialImages = [],
    variants: initialVariants = [],
    attributes: initialAttributes = [],
    onSave
  }: {
    product?: ProductData | null;
    categories: Category[];
    images?: ImageRow[];
    variants?: VariantRow[];
    attributes?: AttributeRow[];
    onSave: (data: Record<string, unknown>) => Promise<void>;
  } = $props();

  // Active tab
  let activeTab = $state<'basic' | 'images' | 'variants' | 'attributes' | 'inventory' | 'seo'>(
    'basic'
  );

  // Form state
  let title = $state(product?.title ?? '');
  let slug = $state(product?.slug ?? '');
  let categoryId = $state(product?.categoryId ?? '');
  let basePrice = $state(Number(product?.basePrice ?? 0));
  let description = $state(product?.description ?? '');
  let youtubeUrl = $state(product?.youtubeUrl ?? '');
  let isPublished = $state(product?.isPublished ?? true);
  let stockQty = $state(product?.stockQty ?? 0);
  let lowStockThreshold = $state(product?.lowStockThreshold ?? 5);
  let seoTitle = $state(product?.seoTitle ?? '');
  let seoDescription = $state(product?.seoDescription ?? '');

  let images = $state<ImageRow[]>(initialImages.map((i) => ({ ...i })));
  let variants = $state<VariantRow[]>(
    initialVariants.map((v) => ({
      id: v.id,
      name: v.name,
      options: Array.isArray(v.options) ? (v.options as { label: string; price_modifier: number }[]).map((o) => ({ ...o })) : []
    }))
  );
  let attributes = $state<AttributeRow[]>(initialAttributes.map((a) => ({ ...a })));

  let slugManuallyEdited = $state(!!product);
  let saving = $state(false);
  let saveError = $state('');
  let unsaved = $state(false);

  // Mark unsaved on any change
  $effect(() => {
    title; slug; categoryId; basePrice; description; youtubeUrl; isPublished;
    stockQty; lowStockThreshold; seoTitle; seoDescription;
    unsaved = true;
  });

  function handleTitleInput(e: Event) {
    title = (e.target as HTMLInputElement).value;
    if (!slugManuallyEdited) {
      slug = slugify(title);
    }
  }

  function handleSlugInput(e: Event) {
    slug = (e.target as HTMLInputElement).value;
    slugManuallyEdited = true;
  }

  let metaTitleCount = $derived(seoTitle.length);
  let metaDescCount = $derived(seoDescription.length);

  function stockStatus(): { label: string; cls: string } {
    if (stockQty === 0) return { label: 'Out of Stock', cls: 'badge-red' };
    if (stockQty <= lowStockThreshold) return { label: 'Low Stock', cls: 'badge-yellow' };
    return { label: 'In Stock', cls: 'badge-green' };
  }

  async function handleSave() {
    saving = true;
    saveError = '';
    try {
      await onSave({
        title,
        slug,
        categoryId: categoryId || null,
        basePrice,
        description,
        youtubeUrl: youtubeUrl || '',
        isPublished,
        stockQty,
        lowStockThreshold,
        seoTitle,
        seoDescription,
        images: images.map((img, i) => ({ url: img.url, sortOrder: i })),
        variants,
        attributes
      });
      unsaved = false;
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'images', label: 'Images' },
    { key: 'variants', label: 'Variants' },
    { key: 'attributes', label: 'Attributes' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'seo', label: 'SEO' }
  ];
</script>

<div class="product-form">
  <!-- Tab bar -->
  <div class="tab-bar" role="tablist">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.key}
        role="tab"
        aria-selected={activeTab === tab.key}
        onclick={() => (activeTab = tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  <div class="tab-content">
    <!-- Basic Info -->
    {#if activeTab === 'basic'}
      <div class="form-section">
        <div class="form-field">
          <label for="f-title">Title <span class="required">*</span></label>
          <input
            id="f-title"
            type="text"
            value={title}
            oninput={handleTitleInput}
            placeholder="e.g. Classic White T-Shirt"
            maxlength="200"
          />
        </div>

        <div class="form-field">
          <label for="f-slug">Slug <span class="required">*</span></label>
          <input
            id="f-slug"
            type="text"
            value={slug}
            oninput={handleSlugInput}
            placeholder="e.g. classic-white-t-shirt"
          />
          <span class="field-hint">Lowercase, hyphens only. Must be unique within your store.</span>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="f-category">Category</label>
            <select id="f-category" bind:value={categoryId}>
              <option value="">No category</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>

          <div class="form-field">
            <label for="f-price">Base Price <span class="required">*</span></label>
            <input
              id="f-price"
              type="number"
              bind:value={basePrice}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>

        <div class="form-field">
          <label for="f-youtube">YouTube URL (optional)</label>
          <input
            id="f-youtube"
            type="url"
            bind:value={youtubeUrl}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div class="form-field">
          <label for="f-description">Description</label>
          <textarea
            id="f-description"
            bind:value={description}
            rows="5"
            placeholder="Product description…"
          ></textarea>
        </div>

        <div class="form-field form-field-toggle">
          <label>
            <input type="checkbox" bind:checked={isPublished} />
            Published (visible to customers)
          </label>
        </div>
      </div>
    {/if}

    <!-- Images -->
    {#if activeTab === 'images'}
      <div class="form-section">
        <ImageUploader
          images={images}
          onChange={(updated) => { images = updated; unsaved = true; }}
        />
      </div>
    {/if}

    <!-- Variants -->
    {#if activeTab === 'variants'}
      <div class="form-section">
        <VariantsEditor
          variants={variants}
          onChange={(updated) => { variants = updated; unsaved = true; }}
        />
      </div>
    {/if}

    <!-- Attributes -->
    {#if activeTab === 'attributes'}
      <div class="form-section">
        <AttributesTable
          attributes={attributes}
          onChange={(updated) => { attributes = updated; unsaved = true; }}
        />
      </div>
    {/if}

    <!-- Inventory -->
    {#if activeTab === 'inventory'}
      <div class="form-section">
        <div class="stock-status-row">
          <span class="stock-label">Current Status:</span>
          <span class="badge {stockStatus().cls}">{stockStatus().label}</span>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="f-stock">Stock Quantity</label>
            <input
              id="f-stock"
              type="number"
              bind:value={stockQty}
              min="0"
              step="1"
            />
          </div>

          <div class="form-field">
            <label for="f-threshold">Low Stock Threshold</label>
            <input
              id="f-threshold"
              type="number"
              bind:value={lowStockThreshold}
              min="0"
              step="1"
            />
            <span class="field-hint">Alert when stock falls to or below this number</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- SEO -->
    {#if activeTab === 'seo'}
      <div class="form-section">
        <div class="form-field">
          <label for="f-meta-title">
            Meta Title
            <span class="char-count" class:over-limit={metaTitleCount > 60}>
              {metaTitleCount}/60
            </span>
          </label>
          <input
            id="f-meta-title"
            type="text"
            bind:value={seoTitle}
            maxlength="60"
            placeholder="Page title for search engines"
          />
        </div>

        <div class="form-field">
          <label for="f-meta-desc">
            Meta Description
            <span class="char-count" class:over-limit={metaDescCount > 160}>
              {metaDescCount}/160
            </span>
          </label>
          <textarea
            id="f-meta-desc"
            bind:value={seoDescription}
            maxlength="160"
            rows="3"
            placeholder="Brief description for search engines"
          ></textarea>
        </div>

        {#if seoTitle || seoDescription || title}
          <div class="seo-preview">
            <div class="seo-preview-label">Google Preview</div>
            <div class="seo-snippet">
              <div class="seo-title">{seoTitle || title || 'Page Title'}</div>
              <div class="seo-url">yourstore.vendwiz.com/{slug || 'product-slug'}</div>
              <div class="seo-desc">{seoDescription || description || 'No description set.'}</div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Sticky footer save bar -->
  <div class="save-bar">
    {#if saveError}
      <span class="save-error">{saveError}</span>
    {/if}
    {#if unsaved}
      <span class="unsaved-indicator">Unsaved changes</span>
    {/if}
    <button class="btn-primary" onclick={handleSave} disabled={saving}>
      {saving ? 'Saving…' : 'Save Changes'}
    </button>
  </div>
</div>

<style>
  .product-form {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    overflow: hidden;
  }

  /* Tabs */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid #e5e5e5;
    overflow-x: auto;
    background: #fafafa;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    color: var(--color-secondary);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn.active {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
    font-weight: 600;
  }

  .tab-btn:hover:not(.active) {
    color: var(--color-text);
    background: #f0f0f0;
  }

  /* Content */
  .tab-content {
    flex: 1;
  }

  .form-section {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Form fields */
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .form-field label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .form-field input[type='text'],
  .form-field input[type='number'],
  .form-field input[type='url'],
  .form-field select,
  .form-field textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.9rem;
    background: #fff;
    width: 100%;
    font-family: inherit;
  }

  .form-field input:focus,
  .form-field select:focus,
  .form-field textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-field textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-field-toggle label {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    cursor: pointer;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .field-hint {
    font-size: 0.76rem;
    color: var(--color-secondary);
  }

  .required {
    color: #cc3333;
  }

  /* Inventory */
  .stock-status-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stock-label {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge-green {
    background: #e6f4ea;
    color: #137333;
  }

  .badge-yellow {
    background: #fff8e1;
    color: #7a5800;
  }

  .badge-red {
    background: #ffe0e0;
    color: #990000;
  }

  /* SEO */
  .char-count {
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--color-secondary);
    margin-left: auto;
  }

  .char-count.over-limit {
    color: #cc3333;
  }

  .seo-preview {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
  }

  .seo-preview-label {
    background: var(--color-surface);
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #e5e5e5;
  }

  .seo-snippet {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .seo-title {
    color: #1a0dab;
    font-size: 1rem;
    font-weight: 500;
  }

  .seo-url {
    color: #006621;
    font-size: 0.78rem;
  }

  .seo-desc {
    color: #545454;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  /* Save bar */
  .save-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.5rem;
    border-top: 1px solid #e5e5e5;
    background: #fafafa;
    position: sticky;
    bottom: 0;
  }

  .save-error {
    color: #cc3333;
    font-size: 0.85rem;
    flex: 1;
  }

  .unsaved-indicator {
    font-size: 0.8rem;
    color: var(--color-secondary);
    flex: 1;
  }

  .btn-primary {
    background: var(--color-text);
    color: #fff;
    border: none;
    padding: 0.55rem 1.25rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-left: auto;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.85;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
