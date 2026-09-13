# SPEC-06 — Storefront (Customer-Facing)

## Overview
Complete customer-facing storefront: product listing, product detail, cart (localStorage), checkout, order confirmation, and order tracking. All under the `(storefront)` route group, resolved via subdomain routing from `hooks.server.ts`.

---

## 1. Route Group Setup

All storefront routes: `src/routes/(storefront)/`

### `src/routes/(storefront)/+layout.server.ts`
```ts
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.store || !locals.isStorefront) {
    throw error(404, 'Store not found');
  }
  // Load store with shipping config and policies links
  return { store: locals.store };
};
```

### `src/routes/(storefront)/+layout.svelte`
- Inject store theme CSS vars via a `<style>` block using `data.store` theme values
- **Announcement bar:** if `store.announcementBarEnabled && store.announcementBarText`, show full-width colored strip at very top
- **Header:**
  - Store logo (link to /)
  - Store name as wordmark if no logo
  - Search icon → inline search bar expand
  - Cart icon with item count badge (from Svelte store)
  - Navigation: Categories (dropdown from store's root categories)
- **Footer:**
  - Social icons: WhatsApp, Instagram, Facebook (from store settings)
  - Policy links: Return Policy, Shipping Info, Terms & Conditions, FAQ
  - Contact email
  - "Powered by VendWiz" (small, unobtrusive)

---

## 2. Cart Store (localStorage)

**`src/lib/stores/cart.ts`**
```ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price: number; // final price (base + variant modifier)
  quantity: number;
  variantSelections?: Record<string, string>; // { "Size": "Large", "Color": "Red" }
}

function createCart() {
  const stored = browser ? localStorage.getItem('vendwiz_cart') : null;
  const initial: CartItem[] = stored ? JSON.parse(stored) : [];
  const { subscribe, set, update } = writable<CartItem[]>(initial);

  return {
    subscribe,
    addItem(item: CartItem) {
      update(items => {
        const key = `${item.productId}_${JSON.stringify(item.variantSelections ?? {})}`;
        const existing = items.find(i =>
          `${i.productId}_${JSON.stringify(i.variantSelections ?? {})}` === key
        );
        let next: CartItem[];
        if (existing) {
          next = items.map(i => i === existing
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
          );
        } else {
          next = [...items, item];
        }
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    removeItem(productId: string, variantSelections?: Record<string, string>) {
      update(items => {
        const next = items.filter(i =>
          !(i.productId === productId &&
            JSON.stringify(i.variantSelections ?? {}) === JSON.stringify(variantSelections ?? {}))
        );
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    updateQuantity(productId: string, quantity: number, variantSelections?: Record<string, string>) {
      update(items => {
        const next = quantity <= 0
          ? items.filter(i => i.productId !== productId)
          : items.map(i => i.productId === productId &&
              JSON.stringify(i.variantSelections ?? {}) === JSON.stringify(variantSelections ?? {})
              ? { ...i, quantity }
              : i
          );
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    clear() {
      set([]);
      if (browser) localStorage.removeItem('vendwiz_cart');
    }
  };
}

export const cart = createCart();
```

---

## 3. Homepage

### `src/routes/(storefront)/+page.svelte`
- Hero section: store name, optional tagline
- Featured products grid (first 8 active products, or products with `is_active = true` sorted by newest)
- "View All Products" link

### `src/routes/(storefront)/+page.server.ts`
- Load 8 featured products with their first image
- Return store data (already in layout)

---

## 4. Product Listing Page (PLP)

### `src/routes/(storefront)/products/+page.svelte`
**Layout:** Sidebar (filters) + main grid

**Sidebar filters:**
- Category tree (checkboxes, hierarchical)
- Price range (min/max inputs or dual-handle slider)
- Clear filters button

**Sort dropdown:** Newest | Price: Low to High | Price: High to Low | A-Z | Z-A

**Product grid:**
- Card: image, title, price, stock badge (out of stock overlay if qty=0)
- Hover: quick "Add to Cart" button (if no variants)
- Link to PDP

**Search:** URL param `?q=` filters by title (debounced on client)

**Pagination:** 24 per page, page param in URL `?page=2`

### `src/routes/(storefront)/products/+page.server.ts`
- Accept `q`, `category`, `minPrice`, `maxPrice`, `sort`, `page` query params
- Query products with filters, return paginated results
- Return categories for sidebar

---

## 5. Product Detail Page (PDP)

### `src/routes/(storefront)/products/[slug]/+page.svelte`

**Left column — Images:**
- Swipeable image carousel (CSS-only touch/swipe or Svelte gesture)
- Thumbnail strip below main image
- YouTube embed section below images if `youtubeUrl` set (extract video ID, use iframe)

**Right column — Info:**
- Title (h1)
- Price display (base price + selected variant modifier)
- Availability badge: In Stock / Low Stock / Out of Stock
- **Variant selectors:** For each `ProductVariant`, show button group or select:
  - User selects one option per variant
  - Price updates dynamically as selections change
- Quantity picker (+/- buttons, min 1, max stock)
- "Add to Cart" button (disabled if out of stock)
- "Add to Cart" triggers `cart.addItem(...)` + shows toast notification

**Below fold:**
- Product description (rendered HTML from Tiptap)
- Attributes table (if any): specs/details
- Reviews section:
  - Average rating stars + count
  - List of approved reviews (customer name, rating, date, text)
  - "Write a Review" form (name, rating 1-5 stars, comment text) → POST /api/storefront/reviews
- **You Might Also Like:** 4 products from same category (exclude current)

### `src/routes/(storefront)/products/[slug]/+page.server.ts`
- Load product by slug + store ID
- Load approved reviews
- Load related products (same category, limit 4)
- 404 if not found or not active

---

## 6. Cart Page

### `src/routes/(storefront)/cart/+page.svelte`
- Read from `cart` Svelte store (client-only)
- Item rows: image, title, variant info, price, quantity controls, remove button
- Empty cart state with "Continue Shopping" link
- **Discount code input:** text field + "Apply" button
  - On apply: GET /api/storefront/discount?code=XXX
  - Show success/error message
  - Store applied discount in a `cartDiscount` store
- **Order summary panel:**
  - Subtotal
  - Shipping fee (fetch from store's shipping config)
  - Tax (based on tax rate)
  - Discount amount (if applied)
  - **Total**
- "Proceed to Checkout" button → `/checkout`

### Shipping preview:
Load `GET /api/storefront/shipping-config` on mount to show shipping fee estimate.

---

## 7. Checkout Page

### `src/routes/(storefront)/checkout/+page.svelte`
- If cart is empty: redirect to `/`
- **Customer form:**
  - Full Name (required)
  - Phone Number (required, Pakistani format or international)
  - Email Address (required)
  - Shipping Address (textarea, required)
  - Order notes (optional textarea)
- **Order summary:** read-only items list + totals (same as cart summary)
- **Place Order** button → POST /api/storefront/checkout
- Show loading state, disable button on submit
- On success: redirect to `/checkout/confirmation?ref=ORDERREF`
- On error: show error message inline

### `src/routes/api/storefront/checkout/+server.ts`
```ts
// POST body: { customerName, customerPhone, customerEmail, shippingAddress, notes?, discountCode?, items[] }
// 1. Validate body with Zod
// 2. Load store's shipping config
// 3. Load discount code if provided, validate it
// 4. Re-calculate totals server-side (never trust client totals)
// 5. Generate orderRef with nanoid(8).toUpperCase()
// 6. Insert order into DB
// 7. Increment discount code usage_count if used
// 8. Return { orderRef, whatsappUrl? }
```

---

## 8. Order Confirmation Page

### `src/routes/(storefront)/checkout/confirmation/+page.svelte`
- URL param: `?ref=ORDERREF`
- Large success icon ✓
- "Order Placed Successfully!" heading
- Order reference: `#ORDERREF` (copyable)
- "Your order is being processed." message
- If store has WhatsApp: "Click to send us a WhatsApp confirmation" button → opens WA link
- "Continue Shopping" button
- "Track Your Order" link → `/track`

---

## 9. Order Tracker (Public)

### `src/routes/(storefront)/track/+page.svelte`
- Form: Order Reference input + Email input
- Submit → GET /api/storefront/track?ref=XXX&email=yyy
- On found: Show:
  - Order ref, date placed
  - Status with timeline (pending → processing → dispatched → completed)
  - Items summary (titles + quantities only, no prices)
- On not found: "No order found with those details"

---

## 10. Policy Pages

### `src/routes/(storefront)/policies/[type]/+page.svelte`
- Types: `return`, `shipping`, `terms`, `faq`
- Load policy content from DB
- Render HTML from Tiptap content with `{@html content}`
- 404 if store has no content for that type

---

## 11. Storefront API Routes

**`src/routes/api/storefront/reviews/+server.ts`**
- `POST` — submit review (body: `{ productId, customerName, rating, text? }`)
- `is_approved` defaults to false (needs admin approval from SPEC-05)
- Rate limit: store IP to prevent spam (basic: check for same IP + productId within 1h)

**`src/routes/api/storefront/shipping-config/+server.ts`**
- `GET` — return store's `{ flatRate, freeShippingThreshold, taxRate }`
- Resolves store from `event.locals.store`

---

## 12. SEO

Each product page sets `<svelte:head>` with:
```svelte
<svelte:head>
  <title>{product.metaTitle || product.title} | {data.store.name}</title>
  <meta name="description" content={product.metaDescription || ''} />
  <meta property="og:title" content={product.metaTitle || product.title} />
  <meta property="og:image" content={product.images[0]?.url || ''} />
</svelte:head>
```

---

## 13. Zod Schemas

`src/lib/schemas/storefront.ts`:
```ts
import { z } from 'zod';

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.string().email(),
  shippingAddress: z.string().min(10).max(500),
  notes: z.string().max(500).optional(),
  discountCode: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    title: z.string(),
    slug: z.string(),
    imageUrl: z.string().optional(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    variantSelections: z.record(z.string()).optional()
  })).min(1)
});

export const reviewSchema = z.object({
  productId: z.string(),
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional()
});
```
