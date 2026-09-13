# SPEC-07: Product Detail Page, Cart & Guest Checkout

## Goal
Customer PDP with media gallery/variants/reviews/cross-sell, cart (localStorage), guest checkout, order confirmation.

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM (server loads)
- Tailwind CSS v4
- Cart: localStorage, Svelte store / runes `$state`
- **Model**: claude-sonnet-4-6

## Cart Store — `src/lib/stores/cart.ts`
Use Svelte 5 runes with localStorage persistence.
```ts
// cart.svelte.ts
// Exports: cartItems, cartCount, cartTotal, addToCart, removeFromCart, updateQty, clearCart, applyDiscount
```
- `CartItem` type from `$lib/types.ts`
- Key: `vendwiz-cart-{storeId}` in localStorage
- Load from localStorage on first client render (`$effect`)
- Sync to localStorage on every change

## Product Detail Page — `/products/[slug]`

### `+page.server.ts`
Load full product: join optionGroups + values + variants + attributes + reviews (approved only) + related products.
If product not found or not published → `error(404)`.

### `+page.svelte`

**Media Gallery section:**
- Main image display (large, fills left column on desktop)
- Thumbnail strip below (click to switch main image)
- If `youtubeUrl` set: "Watch Video" tab that shows YouTube embed
  - Embed URL: `https://www.youtube.com/embed/{videoId}` (use `getYouTubeId()`)
  - For Shorts: same embed format works
- Mobile: swipeable image carousel (CSS scroll-snap, no JS library)

**Product info section (right column on desktop):**
- Product title (h1)
- Average star rating (if reviews exist)
- Price display:
  - If no variants: just base price
  - If variants: "From {min price}" until variant selected, then show selected price
- Category breadcrumb link

**Variant Selection:**
- Only render if product has optionGroups
- For each group, render option buttons (e.g., Size: [S] [M] [L])
- Selected option: filled/highlighted button
- On selection: update `selectedVariant` state
  - Disable out-of-stock combinations (check variant stockQty)
  - Update displayed price

**Specs/Attributes table:**
- Only render if product has attributes
- Simple 2-column table: Attribute | Value

**Add to Cart section:**
- Quantity selector (+/- buttons, min 1)
- "Add to Cart" button
  - Validates: if product has variants, a complete combination must be selected
  - Calls `addToCart()` from cart store
  - Shows "Added!" feedback for 2s
- Stock indicator: "In Stock" | "Low Stock (X left)" | "Out of Stock" (disabled button)

**Reviews section:**
- Aggregate rating: average stars + total count
- Review list (approved only, newest first, limit 10)
  - Each: reviewer name (first name only for privacy) | star rating | date | body text
- "Write a Review" form (collapsible):
  - Reviewer name (required)
  - Email (optional, not shown publicly)
  - Rating: clickable 1-5 stars
  - Review text (optional)
  - Submit → `POST /api/storefront/reviews` (storeId + productId)
  - Success: "Review submitted for approval!"

**You Might Also Like section:**
- 4 related products from same category (exclude current)
- If not enough in category, fill with recent products from store
- Horizontal scroll on mobile, grid on desktop
- Uses `ProductCard.svelte` component

## Cart Page — `/cart`

### `+page.svelte`
- Cart items list:
  - Product image | title | variant | unit price | qty +/- | line total | remove button
- Discount code input:
  - Text input + "Apply" button
  - POST to `/api/storefront/apply-discount`
  - Shows discount amount or error message
- Order summary:
  - Subtotal
  - Discount (if applied)
  - Shipping (flat rate from store settings, or "Free" if threshold met)
  - Tax (calculated from subtotal * taxRate)
  - **Total**
- "Proceed to Checkout" button → `/checkout`
- "Continue Shopping" link → `/products`
- Empty cart state with link to products

Store settings (shippingFee, freeShippingThreshold, taxRate) needed client-side.
Fetch via `+page.server.ts` load: `{ store: locals.storefront }`.

## Checkout Page — `/checkout`

### `+page.svelte`
Guest checkout form:
- Full Name (required)
- Phone Number (required)
- Email (required)
- Complete Shipping Address (textarea, required)
- Order notes (optional)
- Order summary sidebar (same breakdown as cart)
- "Place Order" button → POST to `/api/storefront/checkout`

Validation: Zod schema, client-side + server-side.

### `/api/storefront/checkout` — `POST`
1. Parse cart + form data from request body
2. Validate all required fields (Zod)
3. Validate stock for each item (reject if insufficient)
4. Apply discount code if present (call `applyDiscount()`)
5. Calculate totals: subtotal, discount, shipping, tax, total
6. Generate orderNumber (call `generateOrderNumber()`)
7. Insert `orders` record + `orderItems` records in a transaction
8. Deduct stock for each item (call `deductStock()`)
9. Increment discount usage if code used
10. Attempt WhatsApp send (call `sendOrderConfirmationWA()`)
    - If sent: set `whatsappSent = true`
    - If not configured: leave false (admin can trigger from dashboard)
11. Return `{ orderId, orderNumber, whatsappSent }`

## Order Confirmation Page — `/order-confirmation`

### `+page.svelte`
- Receives orderId via URL query param or redirected with order data
- Shows:
  - ✅ Success message: "Order Placed Successfully!"
  - Order number (large, prominent)
  - "What happens next?" section:
    - "The store owner will contact you to coordinate payment and delivery"
    - WhatsApp note: "A confirmation message has been sent to your WhatsApp" (if whatsappSent)
    - Or: "You will be contacted shortly"
  - Order summary (items + total)
  - "Track Your Order" link → `/track`
  - "Continue Shopping" link → `/`
- On load: clear cart from localStorage

## Apply Discount API — `/api/storefront/apply-discount`
`POST { code: string, subtotal: number, storeId: string }`
- Calls `applyDiscount()` from `$lib/server/discounts.ts`
- Returns `{ valid, amount, error? }`
- Does NOT consume usage (only on final order placement)

## File structure
```
src/routes/(storefront)/
  products/
    [slug]/
      +page.svelte
      +page.server.ts
  cart/
    +page.svelte
    +page.server.ts
  checkout/
    +page.svelte
  order-confirmation/
    +page.svelte
src/lib/stores/
  cart.svelte.ts
src/lib/components/storefront/
  ReviewForm.svelte
  StarRating.svelte
  VariantSelector.svelte
  QuantitySelector.svelte
  ImageGallery.svelte
src/routes/api/storefront/
  checkout/+server.ts
  apply-discount/+server.ts
  reviews/+server.ts
```
