# SPEC-04: Marketing & Sales Tools

## Goal
Discount code engine + shipping/tax config (shipping is already in store settings, this spec focuses on discount codes management).

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM
- Tailwind CSS v4
- **Model**: claude-sonnet-4-6

## Routes

### `/admin/discounts` — Discount Codes Management

**Listing page (`+page.svelte`)**
- Table: Code | Type | Value | Min Order | Usage | Status | Expires | Actions
- Status badge: Active / Inactive / Expired
- "New Discount" button → slide-over form

**Create form (slide-over or modal):**
Fields:
- Code (text, auto-generate or manual, uppercase enforced)
  - "Generate random code" button → generates e.g. "SUMMER25"
- Type: Percentage % | Fixed Amount
- Value (numeric — percentage 1-100 or fixed amount)
- Min order amount (optional)
- Usage limit (optional, empty = unlimited)
- Active toggle
- Expires at (date picker, optional)

Form action: `?/createDiscount` / `?/updateDiscount` / `?/deleteDiscount`
DB: `discount_codes` table (storeId scoped)

**Validation:**
- Code: uppercase alphanumeric + hyphens, 3-20 chars
- Percentage: 1-100
- Fixed: > 0
- If expiry set: must be in the future

**Discount application logic** (used in checkout, see SPEC-08):
Export `applyDiscount(code, storeId, subtotal, db)` from `$lib/server/discounts.ts`:
1. Look up code (storeId match, isActive=true, not expired, usageCount < usageLimit)
2. Check minOrderAmount
3. Return `{ valid: true, amount: number, discountCodeId }` or `{ valid: false, error: string }`
4. Does NOT increment usageCount here — that happens on order creation

Export `incrementDiscountUsage(discountCodeId, db)`:
- Atomically increments `usageCount`

## File structure
```
src/routes/(app)/admin/
  discounts/
    +page.svelte
    +page.server.ts
    DiscountForm.svelte
src/lib/server/
  discounts.ts
```
