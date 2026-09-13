# SPEC-05: Order Management, Reviews & Analytics

## Goal
Admin order dashboard, order workflow, review moderation, basic analytics.

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM
- Tailwind CSS v4
- **Model**: claude-sonnet-4-6

## Routes

### `/admin/orders` — Order Dashboard

**Listing page (`+page.svelte`)**
- Filter tabs: All | Pending | Processing | Dispatched | Completed | Cancelled
- Search by order number or customer name
- Date range filter
- Table columns: Order # | Customer | Items | Total | Status | Date | Actions
- Status badge with color coding:
  - pending: yellow
  - processing: blue
  - dispatched: purple
  - completed: green
  - cancelled: red
- Click row → navigate to order detail

**Order detail (`/admin/orders/[id]`)**
- Order summary card: order number, date, customer info
- Order items table: product | variant | qty | unit price | subtotal
- Pricing breakdown: subtotal, discount, shipping, tax, total
- Status update section:
  - Current status badge
  - "Move to next status" button (follows workflow: pending → processing → dispatched → completed)
  - "Cancel Order" button (available when not completed/cancelled)
- WhatsApp section:
  - If `whatsappSent = false`: button "Send WhatsApp Confirmation"
    - If WA Cloud API configured: send automatically
    - If not: open wa.me link in new tab
  - If `whatsappSent = true`: "Resend WhatsApp" button
- Notes field (admin internal notes, update via form action)

Form actions:
- `?/updateStatus` — transition order status
- `?/sendWhatsApp` — mark as sent + attempt WA send
- `?/addNote` — save admin note

DB queries:
- List: join orders + items count, filter by storeId
- Detail: orders + orderItems + products
- Status update: check valid transition, update status, updatedAt
- On cancel: restore stock (call `deductStock` with negative qty)

### `/admin/reviews` — Review Moderation

**Listing page:**
- Filter tabs: Pending | Approved | Hidden
- Table: Product | Reviewer | Rating (stars) | Review | Date | Actions
- Actions: Approve / Hide / Delete
- Approve: sets `status = 'approved'`
- Hide: sets `status = 'hidden'`
- Delete: removes record

Form actions: `?/approve`, `?/hide`, `?/delete`

### `/admin/analytics` — Basic Analytics

**Dashboard (`+page.svelte`)**
- Time range filter: Last 7 days | Last 30 days | Last 90 days | All time
- Key metrics cards:
  - Total Orders (count)
  - Total Revenue (sum of order totals for completed/dispatched orders)
  - Average Order Value
  - Pending Orders count
- Top Selling Products table:
  - Join orderItems → products, group by productId, sum quantity + revenue
  - Show top 10
- Simple order status breakdown (count per status)
- Low stock alert section: products with stockQty <= lowStockThreshold

**Server load**: All analytics computed server-side with Drizzle aggregate queries.

## Admin Dashboard Home — `/admin`

Landing page after login:
- Widgets grid:
  1. Quick stats: orders today, revenue today, pending orders
  2. Recent orders (last 5)
  3. Low stock products (up to 5)
  4. Quick actions: "Add Product", "View Orders", "Settings"

## File structure
```
src/routes/(app)/admin/
  +page.svelte              (dashboard home)
  +page.server.ts
  orders/
    +page.svelte
    +page.server.ts
    [id]/
      +page.svelte
      +page.server.ts
  reviews/
    +page.svelte
    +page.server.ts
  analytics/
    +page.svelte
    +page.server.ts
```
