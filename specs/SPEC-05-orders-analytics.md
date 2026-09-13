# SPEC-05 — Orders, Reviews & Analytics

## Overview
Order management with status workflow, WhatsApp notifications, review moderation, analytics dashboard, and low-stock notifications.

---

## 1. Orders Dashboard

### `/admin/orders` — Order List
**File:** `src/routes/(app)/admin/orders/+page.svelte`

**Filters bar:**
- Status dropdown: All | Pending | Processing | Dispatched | Completed | Cancelled
- Date range picker (from/to)
- Search by order ref or customer name

**Table columns:** Order Ref | Customer | Total | Status badge | Date | Actions

**Status badge colors:**
- pending: amber/yellow
- processing: blue
- dispatched: indigo/purple
- completed: green
- cancelled: red

**Actions per row:**
- View details → `/admin/orders/[id]`
- Quick status change dropdown

**Pagination:** 20 per page, prev/next

### `/admin/orders/[id]` — Order Detail
**File:** `src/routes/(app)/admin/orders/[id]/+page.svelte`

Sections:
1. **Order Header:** Ref, date, status badge
2. **Customer Info:** Name, phone (click to call), email, shipping address
3. **Order Items:** Product image, title, variant selections, quantity, price
4. **Pricing Breakdown:** Subtotal, shipping fee, tax, discount (code + amount), **Total**
5. **Status Management:** Dropdown to change status + "Update" button
   - On update: PUT /api/admin/orders/[id]/status
   - Show confirmation for cancellation
6. **WhatsApp:** Button to open WhatsApp notification for this order
7. **Notes:** Textarea for internal notes, save button

---

## 2. Order Status Workflow

Valid transitions:
- `pending` → `processing` | `cancelled`
- `processing` → `dispatched` | `cancelled`
- `dispatched` → `completed` | `cancelled`
- `completed` → (terminal)
- `cancelled` → (terminal)

### `PUT /api/admin/orders/[id]/status`
```ts
// Body: { status: OrderStatus, notes?: string }
// Validate transition is allowed
// Update orders table
// Return updated order
```

---

## 3. WhatsApp Notifications

### `src/lib/utils/whatsapp.ts`
```ts
export function buildOrderConfirmationMessage(order: Order, storeWhatsapp: string): string {
  const items = (order.items as OrderItem[])
    .map(i => `• ${i.title} x${i.quantity} — PKR ${i.price * i.quantity}`)
    .join('\n');
  
  return `🛍️ *New Order: #${order.orderRef}*\n\n` +
    `*Customer:* ${order.customerName}\n` +
    `*Phone:* ${order.customerPhone}\n` +
    `*Address:* ${order.shippingAddress}\n\n` +
    `*Items:*\n${items}\n\n` +
    `*Total:* PKR ${order.total}\n` +
    (order.discountCode ? `*Discount:* ${order.discountCode} (-PKR ${order.discountAmount})\n` : '') +
    `\nThank you for your order! 🙏`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
```

### On order creation (in checkout API):
- If store has `whatsapp` set, build the WA link and include in response
- Set `whatsapp_sent = false` initially (it's a link, not auto-send)
- When admin clicks WhatsApp button in order detail: opens wa.me link in new tab

### WhatsApp Cloud API (optional, advanced):
- If `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_ID` env vars are set, auto-send a template message
- Otherwise fall back to wa.me link

---

## 4. Reviews Moderation

### `/admin/reviews` — Review Management
**File:** `src/routes/(app)/admin/reviews/+page.svelte`

**Filter tabs:** All | Pending Approval | Approved | Hidden

**Table columns:** Product | Customer | Rating (stars) | Review text | Date | Status | Actions

**Actions:**
- Approve (set `is_approved = true`)
- Hide/unapprove (set `is_approved = false`)
- Delete (with confirmation)

**Bulk actions:** Select all → Approve All / Delete All

### API Routes — Reviews

**`src/routes/api/admin/reviews/+server.ts`**
- `GET` — list reviews for store (filter: `status=pending|approved|all`)

**`src/routes/api/admin/reviews/[id]/+server.ts`**
- `PUT` — update `{ isApproved: boolean }`
- `DELETE` — delete review

---

## 5. Analytics Dashboard

### `/admin/analytics` — Analytics
**File:** `src/routes/(app)/admin/analytics/+page.svelte`

**Date range selector:** Last 7 days | Last 30 days | Last 90 days | Custom

**Stat cards (top row):**
- Total Orders (in range)
- Total Revenue (sum of `total` where status ≠ cancelled)
- Average Order Value
- Pending Orders count

**Charts:**
- Orders over time: bar chart (daily order count)
- Revenue over time: line chart
- (Use plain SVG or a lightweight chart library if available)

**Top Products table:**
- Parse `orders.items` JSONB
- Group by product, sum quantity sold
- Top 10 by revenue

**Order status breakdown:** donut or simple bar

**Low-stock alerts section:**
- Products where `stock_quantity <= low_stock_threshold`
- Table: Product | Stock | Threshold | Link to edit

### API Routes — Analytics

**`src/routes/api/admin/analytics/+server.ts`**
- `GET ?from=DATE&to=DATE`
- Returns:
  ```ts
  {
    totalOrders: number,
    totalRevenue: number,
    avgOrderValue: number,
    pendingOrders: number,
    ordersByDay: { date: string, count: number, revenue: number }[],
    topProducts: { productId: string, title: string, qtySold: number, revenue: number }[],
    statusBreakdown: { status: string, count: number }[],
    lowStockProducts: { id: string, title: string, stock: number, threshold: number }[]
  }
  ```

---

## 6. Low-Stock Notification Badge

In the admin sidebar (from SPEC-01 layout), show a red badge on the Products nav item when `lowStockCount > 0`.

Fetch count via `GET /api/admin/products/low-stock-count`:
```ts
// Returns { count: number }
// Count products where stock_quantity <= low_stock_threshold AND is_active = true
```

Load this in the admin layout server load function.

---

## 7. Order Tracker (Storefront — public)

### `src/routes/(storefront)/track/+page.svelte`
Form: Order Reference + Email
On submit: GET /api/storefront/track?ref=XXX&email=yyy

### `src/routes/api/storefront/track/+server.ts`
```ts
// Find order by orderRef + customerEmail (case-insensitive)
// Return: order status, items summary, dates (NOT full customer details)
// If not found: 404
```

---

## 8. Zod Schemas

`src/lib/schemas/orders.ts`:
```ts
import { z } from 'zod';

export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'dispatched', 'completed', 'cancelled']),
  notes: z.string().max(500).optional()
});

export const analyticsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
});
```
