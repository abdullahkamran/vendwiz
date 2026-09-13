# SPEC-03: Product Catalog & Inventory Management

## Goal
Full product catalog management: categories, products with variants/attributes/media, inventory tracking, SEO.

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM, `$lib/server/db`
- `nanoid` for IDs
- Tailwind CSS v4
- Image upload via `/api/upload/image`
- **Model**: claude-sonnet-4-6

## Route base
`src/routes/(app)/admin/`

## Categories — `/admin/categories`

### Listing page (`+page.svelte`)
- Table of categories: Name | Slug | Products count | Actions (Edit / Delete)
- "New Category" button → opens slide-over form or navigates to `/admin/categories/new`

### Create/Edit (`/admin/categories/[id]`)
Fields:
- Name (auto-generates slug on input)
- Slug (editable)
- Description (textarea)
- Category image (optional, upload)
- Sort order (number)

Form actions: `?/save`, `?/delete`
DB: insert/update/delete `categories`

## Products — `/admin/products`

### Listing page (`+page.svelte`)
- Search bar, filter by category, filter by status (published/draft)
- Table: Image | Title | Category | Price | Stock | Status | Actions
- Stock badge: green (in stock), yellow (low stock ≤ threshold), red (out of stock)
- "New Product" button

### Create/Edit (`/admin/products/[id]`)
This is a complex multi-section form. Use a single page with vertical sections:

**Section 1 — Basic Info**
- Title (text, required) — auto-generates slug
- Slug (editable)
- Description (Tiptap WYSIWYG or plain textarea)
- Category (select from store's categories)
- Published toggle
- Sort order

**Section 2 — Pricing & Inventory**
- Base price (numeric, required)
- Track inventory toggle
- Stock quantity (shown when trackInventory=true)
- Low stock threshold (default 5)

**Section 3 — Media**
- Image upload zone: drag-and-drop multi-image upload
  - Shows uploaded images as reorderable thumbnails (drag to reorder)
  - Each image has a delete button
  - Upload via `POST /api/upload/image`, store URLs in `products.images` JSON array
- YouTube URL field (optional, validated with `getYouTubeId()`)
  - Shows embedded preview when valid URL entered

**Section 4 — Variants** (collapsible, shown only if user clicks "Add Variants")
- "Add Option Group" button:
  - Creates a group (e.g., "Size") with values (e.g., "S, M, L, XL")
  - Values can be added as comma-separated or one by one
- Variant grid (auto-generated from option combinations):
  - Each row: combination label | price override (optional) | stock qty | SKU (optional)
  - Price override: leave blank to use basePrice
  - DB: `productOptionGroups`, `productOptionValues`, `productVariants`

**Section 5 — Attributes/Specs**
- Dynamic key-value table: "Add Attribute" button
  - Each row: Attribute Name | Value | Delete
  - E.g., "Material" → "100% Cotton"
- DB: `productAttributes`

**Section 6 — SEO**
- SEO Title (pre-filled from product title)
- SEO Description
- Preview Google snippet

Form actions: `?/save`, `?/delete`
When saving:
1. Upsert product record
2. Upsert option groups + values
3. Regenerate variants from option combinations (upsert by combination)
4. Upsert attributes
5. Deduct stock on order (handled in orders spec, not here)

## Low Stock System
- On product listing page, query products where `stockQty <= lowStockThreshold` and `trackInventory = true`
- Show notification badge in sidebar nav when any products are low/out of stock
- Dashboard widget for low stock

## Inventory deduction (for orders)
Export function `deductStock(productId, variantId, qty, db)` in `$lib/server/inventory.ts`:
- If variant exists: update `productVariants.stockQty -= qty`
- Else: update `products.stockQty -= qty`
- Cap at 0 (never go negative in DB; validation before ordering)

## API endpoints
- `GET /api/admin/products?storeId=&search=&categoryId=&status=` — list products
- `GET /api/admin/products/[id]` — get single product with all relations
- The main CRUD is handled via form actions, not API routes

## File structure
```
src/routes/(app)/admin/
  categories/
    +page.svelte
    +page.server.ts
    [id]/
      +page.svelte
      +page.server.ts
  products/
    +page.svelte
    +page.server.ts
    [id]/
      +page.svelte
      +page.server.ts
      VariantEditor.svelte
      AttributeEditor.svelte
      ImageUploader.svelte
src/lib/server/
  inventory.ts
```
