# SPEC-03 — Product Catalog

## Overview
Full CRUD for categories and products, including hierarchical categories, image uploads, variants, attributes, inventory, and SEO.

---

## 1. Categories

### `/admin/categories` — Category Management
**File:** `src/routes/(app)/admin/categories/+page.svelte`

- Table listing all categories (name, slug, parent, sort_order, actions)
- Inline "New Category" button → opens modal or inline form
- Edit: click row or pencil icon → opens edit modal
- Delete: with confirmation dialog
- Drag-to-reorder (use a sortable library or native drag events) to update `sort_order`
- Hierarchical display: indent child categories under parents

**Form fields (create/edit modal):**
- Name (auto-generates slug from name, but slug is editable)
- Parent category (select dropdown, optional — shows only root categories to avoid deep nesting issues)
- Sort order (number, auto-increments)

### API Routes — Categories
**`src/routes/api/admin/categories/+server.ts`**
- `GET` — list all categories for the store (with parent info)
- `POST` — create category (body: `{ name, slug, parentId?, sortOrder? }`)

**`src/routes/api/admin/categories/[id]/+server.ts`**
- `PUT` — update category
- `DELETE` — delete (prevent if it has products assigned)

**`src/routes/api/admin/categories/reorder/+server.ts`**
- `PUT` — body: `[{ id, sortOrder }]`, batch update sort orders

---

## 2. Products

### `/admin/products` — Product List
**File:** `src/routes/(app)/admin/products/+page.svelte`

- Search/filter bar (by title, category, status)
- Product table columns: image thumbnail, title, category, price, stock badge, status, actions
- Stock badge: green (>threshold), yellow (low stock: ≤ threshold), red (out of stock: 0)
- Low-stock warning banner if any products ≤ threshold
- New Product button → `/admin/products/new`
- Edit: link to `/admin/products/[id]`
- Delete: with confirmation

### `/admin/products/new` — Create Product
**File:** `src/routes/(app)/admin/products/new/+page.svelte`

Same form as edit (see below). On save: POST `/api/admin/products`, redirect to `/admin/products/[newId]`.

### `/admin/products/[id]` — Edit Product
**File:** `src/routes/(app)/admin/products/[id]/+page.svelte`

**Tabbed layout** (or scrollable sections):

#### Tab 1 — Basic Info
- Title (text, required)
- Slug (auto-generated from title, editable, unique-per-store validation)
- Category (select from store categories)
- Base price (number, 2 decimals)
- YouTube URL (optional, validated as youtube.com or youtu.be URL)
- Is Active (toggle)
- Description (plain textarea or Tiptap if desired)

#### Tab 2 — Images
- Drag-and-drop multi-image upload zone
- On drop/select: POST each to `/api/admin/upload`, get URL, add to list
- Reorderable image grid (drag to change sort_order)
- Delete individual images (X button)
- First image = primary display image

#### Tab 3 — Variants
Dynamic rows table:
- Each row: Variant Name (e.g. "Size", "Color") + option values
- Option values sub-table per variant: Label | Price Modifier (+/-)
- Add option row button per variant
- Add variant row button
- Remove variant / option buttons
- Saves to `product_variants` table with options as JSONB

#### Tab 4 — Attributes
Simple key-value table:
- Rows: Attribute Name | Value
- Add row / remove row
- Example: "Material" → "100% Cotton", "Origin" → "Pakistan"
- Saves to `product_attributes`

#### Tab 5 — Inventory
- Stock Quantity (integer, non-negative)
- Low Stock Threshold (integer, default 5)
- Current stock status badge shown here

#### Tab 6 — SEO
- Meta Title (text, max 60 chars, char counter)
- Meta Description (textarea, max 160 chars, char counter)
- Preview snippet showing how it looks in Google search results

**Save button:** sticky footer bar with "Save Changes" and unsaved changes indicator

### API Routes — Products
**`src/routes/api/admin/products/+server.ts`**
- `GET` — list products (query: `storeId`, `category`, `search`, `page`, `limit`)
- `POST` — create product (body: full product object)

**`src/routes/api/admin/products/[id]/+server.ts`**
- `GET` — get single product with relations (images, variants, attributes)
- `PUT` — update product + upsert images, variants, attributes
- `DELETE` — soft delete or hard delete

**`src/routes/api/admin/upload/+server.ts`** (shared with SPEC-02)
- `POST` — multipart upload, sharp webp conversion, returns URL

---

## 3. Shared Components

### `src/lib/components/admin/ProductForm.svelte`
Reusable form component used by both new and edit pages.
Props: `product?: Product`, `categories: Category[]`, `onSave: (data) => void`

### `src/lib/components/admin/ImageUploader.svelte`
- Accepts `images: ProductImage[]`
- Emits `onChange(images)` when list changes
- Handles upload, reorder, delete

### `src/lib/components/admin/VariantsEditor.svelte`
- Accepts `variants: ProductVariant[]`
- Emits `onChange(variants)`
- Dynamic rows with option sub-tables

### `src/lib/components/admin/AttributesTable.svelte`
- Accepts `attributes: ProductAttribute[]`
- Emits `onChange(attributes)`

---

## 4. Zod Schemas

`src/lib/schemas/catalog.ts`:
```ts
import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0)
});

export const variantOptionSchema = z.object({
  label: z.string().min(1),
  price_modifier: z.number().default(0)
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  options: z.array(variantOptionSchema).min(1)
});

export const attributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1)
});

export const productSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  categoryId: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  description: z.string().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(z.object({ url: z.string(), sortOrder: z.number() })),
  variants: z.array(variantSchema),
  attributes: z.array(attributeSchema)
});
```

---

## 5. Slug Generation Utility

`src/lib/utils/slug.ts`:
```ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```
