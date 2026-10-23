<script lang="ts">
  import type { Category } from '$lib/server/db/schema';
  import ImageUploader from './ImageUploader.svelte';
  import VariantsEditor from './VariantsEditor.svelte';
  import { validateProductForm, TAB_ORDER } from './productFormValidation';
  import { parseVideoSource, videoThumb } from '$lib/utils/video';
  import { sumFirstGroupStock } from '$lib/utils/stock';
  import AttributesTable from './AttributesTable.svelte';
  import { slugify } from '$lib/utils/slug';

  // Textarea DOM ref for the description field (used by markdown toolbar)
  let descriptionEl: HTMLTextAreaElement | null = $state(null);

  function wrapDescription(before: string, after: string, placeholder = 'text') {
    const el = descriptionEl;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = el.value.slice(start, end) || placeholder;
    description = el.value.slice(0, start) + before + sel + after + el.value.slice(end);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  }

  function insertDescription(text: string) {
    const el = descriptionEl;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    description = el.value.slice(0, start) + text + el.value.slice(end);
    setTimeout(() => {
      const pos = start + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  type ImageRow = { id?: string; url: string; sortOrder: number };
  type VariantOption = { label: string; price_modifier: number; stockQty?: number; colorHex?: string; imageUrl?: string | null };
  type VariantRow = { id?: string; name: string; options: VariantOption[]; sizeChartUrl?: string };
  type AttributeRow = { id?: string; name: string; value: string };

  type ProductData = {
    id?: string;
    title: string;
    slug: string;
    categoryId: string | null;
    basePrice: string | number;
    salePrice?: string | number | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    youtubeUrl?: string | null;
    isPublished: boolean;
    stockQty: number;
    lowStockThreshold: number;
  };

  // Optional YouTube reels for the storefront Reels feed (also managed under Admin -> Reels)
  type ReelRow = { id?: string; videoUrl: string; caption: string; sortOrder: number };

  let {
    product = null,
    categories = [],
    images: initialImages = [],
    variants: initialVariants = [],
    attributes: initialAttributes = [],
    reels: initialReels = [],
    onSave
  }: {
    product?: ProductData | null;
    categories: Category[];
    images?: ImageRow[];
    variants?: VariantRow[];
    attributes?: AttributeRow[];
    reels?: ReelRow[];
    onSave: (data: Record<string, unknown>) => Promise<void>;
  } = $props();

  // Active tab
  let activeTab = $state<'basic' | 'images' | 'variants' | 'attributes' | 'inventory' | 'seo' | 'reels'>(
    'basic'
  );

  // Form state
  let title = $state(product?.title ?? '');
  let slug = $state(product?.slug ?? '');
  let categoryId = $state(product?.categoryId ?? '');
  let basePrice = $state(Number(product?.basePrice ?? 0));
  // Optional sale price (empty = not on sale)
  let salePrice = $state<number | null>(product?.salePrice != null ? Number(product.salePrice) : null);
  let description = $state(product?.description ?? '');
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
      // Spread each option so stockQty is preserved alongside label/price_modifier
      options: Array.isArray(v.options) ? (v.options as VariantOption[]).map((o) => ({ ...o })) : [],
      sizeChartUrl: v.sizeChartUrl ?? ''
    }))
  );
  let attributes = $state<AttributeRow[]>(initialAttributes.map((a) => ({ ...a })));

  let slugManuallyEdited = $state(!!product);
  let saving = $state(false);
  let saveError = $state('');
  let unsaved = $state(false);
  // Set after a failed save attempt so invalid / missing fields show in red
  let showErrors = $state(false);

  let reels = $state<ReelRow[]>(initialReels.map((r) => ({ ...r })));
  function addReel() {
    const next = reels.length ? Math.max(...reels.map((r) => Number(r.sortOrder) || 0)) + 1 : 0;
    reels = [...reels, { videoUrl: '', caption: '', sortOrder: next }];
  }
  function removeReel(i: number) {
    reels = reels.filter((_, idx) => idx !== i);
  }

  // Mark unsaved on any change
  $effect(() => {
    title; slug; categoryId; basePrice; salePrice; description; isPublished; reels;
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

  // With variants, inventory is the combined stock of all variant options (read-only here)
  let variantStock = $derived(sumFirstGroupStock(variants));
  let effectiveStock = $derived(variantStock ?? stockQty);

  function stockStatus(): { label: string; cls: string } {
    if (effectiveStock === 0) return { label: 'Out of Stock', cls: 'badge-red' };
    if (effectiveStock <= lowStockThreshold) return { label: 'Low Stock', cls: 'badge-yellow' };
    return { label: 'In Stock', cls: 'badge-green' };
  }

  // Turns raw server validation text (e.g. "variants.1.name: Too small…") into something a person can act on
  function friendlyError(msg: string): string {
    const m = msg.match(/variants.(d+).name/);
    if (m) return `Variant ${Number(m[1]) + 1} needs a name. Please fill in the highlighted field.`;
    return msg;
  }

  let validation = $derived(
    validateProductForm({
      title, slug, basePrice, salePrice, stockQty: effectiveStock, lowStockThreshold, seoTitle, seoDescription,
      variants, attributes, reels
    })
  );
  let fe = $derived(validation.fields);

  async function handleSave() {
    saveError = '';
    if (!validation.valid) {
      showErrors = true;
      activeTab = TAB_ORDER.find((t) => validation.tabs.has(t)) ?? activeTab;
      saveError = 'Please fix the fields highlighted in red.';
      return;
    }
    saving = true;
    try {
      await onSave({
        title,
        slug,
        categoryId: categoryId || null,
        basePrice,
        salePrice: salePrice ?? null,
        description,
        isPublished,
        stockQty: effectiveStock,
        lowStockThreshold,
        seoTitle,
        seoDescription,
        images: images.map((img, i) => ({ url: img.url, sortOrder: i })),
        variants,
        attributes,
        reels: reels.map((r) => ({ id: r.id, videoUrl: r.videoUrl.trim(), caption: r.caption.trim() || null, sortOrder: Number(r.sortOrder) || 0 }))
      });
      unsaved = false;
    } catch (err) {
      saveError = err instanceof Error ? friendlyError(err.message) : 'Save failed';
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
    { key: 'seo', label: 'SEO' },
    { key: 'reels', label: 'Reels' }
  ];
</script>

<div class="product-form">
  <!-- Tab bar -->
  <div class="tab-bar" role="tablist">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.key}
        class:has-error={showErrors && validation.tabs.has(tab.key)}
        role="tab"
        aria-selected={activeTab === tab.key}
        onclick={() => (activeTab = tab.key)}
      >
        {tab.label}{#if showErrors && validation.tabs.has(tab.key)} <span class="tab-error-dot" aria-label="has errors">●</span>{/if}
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
            class:field-invalid={showErrors && fe.title}
            aria-invalid={showErrors && !!fe.title}
          />
          {#if showErrors && fe.title}<span class="field-error-msg">{fe.title}</span>{/if}
        </div>

        <div class="form-field">
          <label for="f-slug">Slug <span class="required">*</span></label>
          <input
            id="f-slug"
            type="text"
            value={slug}
            oninput={handleSlugInput}
            placeholder="e.g. classic-white-t-shirt"
            class:field-invalid={showErrors && fe.slug}
            aria-invalid={showErrors && !!fe.slug}
          />
          {#if showErrors && fe.slug}<span class="field-error-msg">{fe.slug}</span>{/if}
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
              class:field-invalid={showErrors && fe.basePrice}
              aria-invalid={showErrors && !!fe.basePrice}
            />
          {#if showErrors && fe.basePrice}<span class="field-error-msg">{fe.basePrice}</span>{/if}
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="f-sale-price">Sale Price (optional)</label>
            <input
              id="f-sale-price"
              type="number"
              bind:value={salePrice}
              min="0"
              step="0.01"
              placeholder="Leave empty if not on sale"
              class:field-invalid={showErrors && fe.salePrice}
              aria-invalid={showErrors && !!fe.salePrice}
            />
            {#if showErrors && fe.salePrice}<span class="field-error-msg">{fe.salePrice}</span>{/if}
            <span class="field-hint">Must be lower than the base price. Customers see the base price crossed out.</span>
          </div>
        </div>

        <div class="form-field">
          <label for="f-description">Description</label>
          <!-- Markdown toolbar — mirrors the policies editor pattern -->
          <div class="md-toolbar">
            <button type="button" title="Bold" onclick={() => wrapDescription('**', '**', 'bold text')} class="md-btn"><strong>B</strong></button>
            <button type="button" title="Italic" onclick={() => wrapDescription('_', '_', 'italic text')} class="md-btn"><em>I</em></button>
            <button type="button" title="Numbered list" onclick={() => insertDescription('\n1. ')} class="md-btn">1. List</button>
            <button type="button" title="New line" onclick={() => insertDescription('\n')} class="md-btn">↵</button>
          </div>
          <textarea
            id="f-description"
            bind:value={description}
            bind:this={descriptionEl}
            rows="5"
            placeholder="Product description… (markdown supported)"
          ></textarea>
          <span class="field-hint">Markdown supported (e.g. **bold**, _italic_, 1. numbered list)</span>
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
          productImages={images}
          {showErrors}
          onChange={(updated) => { variants = updated; unsaved = true; }}
        />
      </div>
    {/if}

    <!-- Attributes -->
    {#if activeTab === 'attributes'}
      <div class="form-section">
        <AttributesTable
          attributes={attributes}
          {showErrors}
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
              value={effectiveStock}
              oninput={(e) => (stockQty = (e.currentTarget as HTMLInputElement).valueAsNumber)}
              disabled={variantStock !== null}
              min="0"
              step="1"
              class:field-invalid={showErrors && fe.stockQty}
            />
            {#if variantStock !== null}
              <span class="field-hint">Calculated from your variants' stock. Change it per option in the Variants tab.</span>
            {/if}
          {#if showErrors && fe.stockQty}<span class="field-error-msg">{fe.stockQty}</span>{/if}
          </div>

          <div class="form-field">
            <label for="f-threshold">Low Stock Threshold</label>
            <input
              id="f-threshold"
              type="number"
              bind:value={lowStockThreshold}
              min="0"
              step="1"
              class:field-invalid={showErrors && fe.lowStockThreshold}
            />
          {#if showErrors && fe.lowStockThreshold}<span class="field-error-msg">{fe.lowStockThreshold}</span>{/if}
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
            class:field-invalid={showErrors && fe.seoTitle}
          />
          {#if showErrors && fe.seoTitle}<span class="field-error-msg">{fe.seoTitle}</span>{/if}
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
            class:field-invalid={showErrors && fe.seoDescription}
          ></textarea>
          {#if showErrors && fe.seoDescription}<span class="field-error-msg">{fe.seoDescription}</span>{/if}
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

    <!-- Reels (optional) -->
    {#if activeTab === 'reels'}
      <div class="form-section">
        <p class="field-hint reels-intro">
          Optional. Add YouTube or YouTube Shorts videos of this product to show in the storefront Reels feed,
          with its price and an Add to cart button. All reels can also be managed under Admin &rarr; Reels.
        </p>

        {#each reels as reel, i}
          {@const src = parseVideoSource(reel.videoUrl)}
          {@const bad = showErrors && !src}
          <div class="reel-row">
            <div class="reel-thumb">
              {#if src}<img src={videoThumb(src)} alt="" />{:else}<span>&#9654;</span>{/if}
            </div>
            <div class="reel-fields">
              <div class="form-field">
                <label for="f-reel-url-{i}">YouTube link</label>
                <input
                  id="f-reel-url-{i}"
                  type="text"
                  inputmode="url"
                  bind:value={reel.videoUrl}
                  placeholder="https://www.youtube.com/shorts/..."
                  class:field-invalid={bad}
                  aria-invalid={bad}
                />
                {#if bad}
                  <span class="field-error-msg">Enter a YouTube or YouTube Shorts link</span>
                {:else if reel.videoUrl.trim() && src}
                  <span class="field-hint">&#10003; {src.isShort ? 'YouTube Short' : 'YouTube video'}</span>
                {/if}
              </div>
              <div class="reel-meta">
                <div class="form-field reel-caption-field">
                  <label for="f-reel-caption-{i}">Caption (optional)</label>
                  <input id="f-reel-caption-{i}" type="text" maxlength="300" bind:value={reel.caption} placeholder="e.g. Just launched" />
                </div>
                <div class="form-field reel-order-field">
                  <label for="f-reel-order-{i}">Order</label>
                  <input id="f-reel-order-{i}" type="number" bind:value={reel.sortOrder} />
                </div>
              </div>
            </div>
            <button type="button" class="btn-delete btn-sm reel-remove" onclick={() => removeReel(i)} aria-label="Remove reel">Remove</button>
          </div>
        {/each}

        <button type="button" class="btn-add" onclick={addReel}>+ Add reel</button>
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

  .reels-intro { display: block; margin-bottom: 1rem; }
  .reel-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }
  .reel-thumb {
    width: 56px;
    height: 72px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
  }
  .reel-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .reel-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .reel-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .reel-caption-field { flex: 1; min-width: 180px; }
  .reel-order-field { width: 90px; }
  .reel-remove { flex-shrink: 0; }

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

  .form-field :global(.field-invalid) {
    border-color: #cc3333;
    background: #fff5f5;
  }

  .field-error-msg {
    color: #cc3333;
    font-size: 0.78rem;
  }

  .tab-btn.has-error {
    color: #cc3333;
  }

  .tab-error-dot {
    font-size: 0.6rem;
    vertical-align: middle;
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

  /* Markdown toolbar */
  .md-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
  }

  .md-btn {
    background: none;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 0.8rem;
    cursor: pointer;
    line-height: 1.4;
    color: var(--color-text);
    transition: background 0.1s;
  }

  .md-btn:hover {
    background: #f0f0f0;
    border-color: var(--color-accent);
  }

  .field-hint {
    font-size: 0.78rem;
    color: var(--color-secondary);
    margin-top: 2px;
  }
</style>
