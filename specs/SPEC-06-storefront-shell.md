# SPEC-06: Customer Storefront — Shell, PLP & Discovery

## Goal
Customer-facing PWA storefront: layout shell, homepage, product listing page with filters/sort/search, and order tracking page.

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM (server loads)
- Tailwind CSS v4
- **Model**: claude-sonnet-4-6

## Multi-tenant routing
The storefront is served when `event.locals.storefront` is set (subdomain detected in `hooks.server.ts`).

Route group: `src/routes/(storefront)/`

The storefront layout reads `event.locals.storefront` to get store data. If no storefront (null), show 404.

### Layout — `src/routes/(storefront)/+layout.server.ts`
```ts
export const load = async ({ locals }) => {
  if (!locals.storefront) return error(404, 'Store not found');
  return { store: locals.storefront };
};
```

### Layout — `src/routes/(storefront)/+layout.svelte`
- Apply store theme: inject CSS vars from `store.customTheme` or from preset theme map
- Render announcement bar if `store.announcementEnabled`
- Render header with: store logo/name, search icon, cart icon (badge with count)
- Render footer with: store social links, policy page links, store description

## Header component (`StorefrontHeader.svelte`)
- Store logo (if set) + store name
- Global search bar (expands on click, debounced 300ms, hits `/api/storefront/search?q=&storeId=`)
- Cart icon with item count badge (reads from localStorage cart)
- "Install App" button (shows only when PWA beforeinstallprompt event fires)
- Mobile: hamburger menu that opens a drawer

## Announcement Bar (`AnnouncementBar.svelte`)
- Fixed top or just above header
- Text content from `store.announcementText`
- BG/FG from `store.announcementBg` / `store.announcementFg`
- Dismissable (localStorage flag `dismissed-announcement-{storeId}`)

## Footer component (`StorefrontFooter.svelte`)
- Social links: WhatsApp | Instagram | Facebook | Email | Phone (icons)
- Policy links: Return Policy | Shipping | Terms | FAQ (from `store_policies`)
- Store description
- © Year Store Name

## Homepage — `src/routes/(storefront)/+page.svelte`
- Hero banner (use store announcement or a default "Shop [StoreName]" banner)
- Category chips row (horizontal scroll, clickable filters)
- Product grid (all published products, ordered by sortOrder, limit 12)
- "View All Products" button → `/products`

Server load: fetch categories + first 12 products for storeId

## Product Listing Page — `/products`

### `+page.svelte`
- Filter sidebar (desktop) / filter drawer (mobile):
  - Category filter (checkboxes)
  - Price range filter (min/max inputs)
- Sort selector: Featured | Newest | Price: Low → High | Price: High → Low | A-Z
- Product grid (responsive 2-4 columns)
- Each product card:
  - Image (first from images array, fallback placeholder)
  - Title
  - Price (or "from $X" if has variants with different prices)
  - Stock badge if out of stock
  - Link to `/products/[slug]`
- Pagination (page= query param, 24 per page)
- Empty state if no products match

### `+page.server.ts`
Load with URL search params: `?category=`, `?minPrice=`, `?maxPrice=`, `?sort=`, `?page=`
Drizzle query with WHERE filters and ORDER BY.

## Search API — `/api/storefront/search`
`GET /api/storefront/search?q=keyword&storeId=xxx`
- Search `products.title` + `products.description` using SQL ILIKE
- Return max 10 results: `[{ id, title, slug, price, imageUrl }]`
- Only published products from the store

## Order Tracking Page — `/track`

### `+page.svelte`
- Public page, no auth required
- Form: Order Number + Email address
- On submit: POST to `/api/storefront/track-order`
  - Look up order by orderNumber + customerEmail (storeId scoped)
  - Return order status + items summary
- Result card:
  - Order # and date
  - Status with timeline visualization (stepper):
    pending → processing → dispatched → completed
  - Items list (product name, qty, price)
  - Shipping address
- Error: "Order not found with these details"

## PWA
- `static/manifest.json` already created
- Service worker: `src/service-worker.ts`
  - Cache-first strategy for static assets
  - Network-first for API routes
- `src/app.html` already has `<link rel="manifest">`
- Install prompt handling in `StorefrontHeader.svelte`

## File structure
```
src/routes/(storefront)/
  +layout.svelte
  +layout.server.ts
  +page.svelte               (homepage)
  +page.server.ts
  products/
    +page.svelte             (PLP)
    +page.server.ts
  track/
    +page.svelte
src/lib/components/storefront/
  StorefrontHeader.svelte
  StorefrontFooter.svelte
  AnnouncementBar.svelte
  ProductCard.svelte
  CategoryChips.svelte
src/service-worker.ts
src/routes/api/storefront/
  search/+server.ts
  track-order/+server.ts
```
