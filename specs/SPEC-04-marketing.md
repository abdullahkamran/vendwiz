# SPEC-04 — Marketing (Discounts & Shipping)

## Overview
Admin pages for discount codes and shipping/tax configuration. These feed directly into the checkout calculation in SPEC-06.

---

## 1. Discount Codes

### `/admin/discounts` — Discount Code Management
**File:** `src/routes/(app)/admin/discounts/+page.svelte`

**List view:**
- Table: Code | Type | Value | Usage (count/limit) | Expires | Status | Actions
- Status badge: Active / Inactive / Expired / Limit Reached
- "New Discount" button → opens create modal/drawer

**Create/Edit form (modal or inline):**
- Code: text input OR "Generate Random" button (8-char uppercase alphanumeric)
- Type: radio — Fixed Amount (PKR/currency) | Percentage (%)
- Value: number (for fixed: amount off, for percent: 0-100)
- Usage Limit: optional number (leave blank for unlimited)
- Expires At: optional date picker
- Active toggle
- Save button

**Actions per row:**
- Toggle active/inactive
- Edit
- Delete (with confirmation)

### API Routes — Discounts

**`src/routes/api/admin/discounts/+server.ts`**
- `GET` — list discount codes for store
- `POST` — create discount code (body: `{ code, type, value, usageLimit?, expiresAt?, isActive }`)

**`src/routes/api/admin/discounts/[id]/+server.ts`**
- `PUT` — update discount code
- `DELETE` — delete discount code

**`src/routes/api/admin/discounts/generate-code/+server.ts`**
- `GET` — returns a random unused 8-char code

---

## 2. Shipping Configuration

### `/admin/shipping` — Shipping & Tax Settings
**File:** `src/routes/(app)/admin/shipping/+page.svelte`

**Form fields:**
- Flat Shipping Rate (number, currency, 0 = free)
- Free Shipping Threshold (number, optional — "Free shipping on orders over PKR X")
- Tax Rate (number, percentage 0-100, e.g. 17 for 17% GST)
- Visual preview: "How this looks at checkout" — example calculation

**Save button → PUT /api/admin/shipping**

On first visit, seed with defaults (flat_rate=0, tax_rate=0).

### API Routes — Shipping

**`src/routes/api/admin/shipping/+server.ts`**
- `GET` — get store's shipping config (or defaults)
- `PUT` — upsert shipping config (body: `{ flatRate, freeShippingThreshold?, taxRate }`)

---

## 3. Discount Validation Logic

Shared utility `src/lib/utils/checkout.ts` (used by SPEC-06 checkout):

```ts
import type { DiscountCode } from '$lib/db/schema';

export interface CartTotals {
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export function calculateTotals(params: {
  subtotal: number;
  flatRate: number;
  freeShippingThreshold: number | null;
  taxRate: number;
  discount: DiscountCode | null;
}): CartTotals {
  const { subtotal, flatRate, freeShippingThreshold, taxRate, discount } = params;

  // Shipping
  const shippingFee = freeShippingThreshold && subtotal >= freeShippingThreshold
    ? 0
    : flatRate;

  // Discount
  let discountAmount = 0;
  if (discount && discount.isActive) {
    if (discount.type === 'fixed') {
      discountAmount = Math.min(Number(discount.value), subtotal);
    } else {
      discountAmount = (subtotal * Number(discount.value)) / 100;
    }
  }

  // Tax applied on (subtotal - discount)
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);

  const total = taxableAmount + shippingFee + taxAmount;

  return {
    subtotal,
    shippingFee,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

export function isDiscountValid(code: DiscountCode): {
  valid: boolean;
  reason?: string;
} {
  if (!code.isActive) return { valid: false, reason: 'This discount code is inactive.' };
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    return { valid: false, reason: 'This discount code has expired.' };
  }
  if (code.usageLimit !== null && code.usageCount >= code.usageLimit) {
    return { valid: false, reason: 'This discount code has reached its usage limit.' };
  }
  return { valid: true };
}
```

---

## 4. Storefront Discount Lookup API

**`src/routes/api/storefront/discount/+server.ts`**
- `GET ?code=PROMO10&storeId=xxx`
- Looks up discount code for the store
- Validates with `isDiscountValid()`
- Returns: `{ valid: boolean, type, value, reason? }`

---

## 5. Zod Schemas

`src/lib/schemas/marketing.ts`:
```ts
import { z } from 'zod';

export const discountCodeSchema = z.object({
  code: z.string().min(3).max(32).toUpperCase(),
  type: z.enum(['fixed', 'percent']),
  value: z.number().positive(),
  usageLimit: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const shippingConfigSchema = z.object({
  flatRate: z.number().min(0).default(0),
  freeShippingThreshold: z.number().positive().optional().nullable(),
  taxRate: z.number().min(0).max(100).default(0)
});
```

---

## 6. Random Code Generator

```ts
// src/lib/utils/codegen.ts
export function generateDiscountCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
```
