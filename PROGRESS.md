# VendWiz — Build Progress

Last updated: 2026-09-14

## Branch Map — All merged into `main`

| Spec | Branch | Status | Merged |
|---|---|---|---|
| SPEC-01 Auth & Onboarding | `feat/auth-onboarding` | ✅ MERGED | commit 263c98e |
| SPEC-02 Store Config | `feat/store-config` | ✅ MERGED | commit 7d3e030 |
| SPEC-03 Catalog | `feat/catalog` | ✅ MERGED | commit 3ede293 |
| SPEC-04 Marketing | `feat/store-config` | ✅ MERGED | same as SPEC-02 — discounts, shipping, announcement |
| SPEC-05 Orders | `feat/orders` | ✅ MERGED | commit d0f8d40 |
| SPEC-06 Storefront Shell | `feat/storefront` | ✅ MERGED | commit 590b9e7 |
| SPEC-07 PDP + Cart + Checkout | `feat/storefront` | ✅ MERGED | same as SPEC-06 |

## What's Left

1. **Integration pass** — All specs are merged. Verify the wiring between them:
   - Auth session flows correctly into admin and storefront
   - Cart → Orders pipeline (guest checkout creating an order record)
   - Discount codes applied at checkout match the discount engine in store-config
   - Storefront subdomain routing (`hooks.server.ts`) resolves the correct store
2. **Env / Deploy** — Need Postgres URL, better-auth secrets, Vercel project + subdomain wildcard (`*.vendwiz.com`) configured
3. **WhatsApp** — orders has the trigger in `src/lib/utils/whatsapp.ts`; needs a real Twilio/WA Cloud API key wired via env var (`WHATSAPP_API_KEY`)

## Architecture Decisions (for context)

- **Auth**: better-auth (modern, Svelte-friendly, handles Google OAuth)
- **ORM**: Drizzle + PostgreSQL
- **Multi-tenancy**: Subdomain routing in `hooks.server.ts` — each store gets its own subdomain
- **Cart**: localStorage-persisted Svelte store (`vendwiz-cart-{storeId}`)
- **No payment gateway** — V1 is COD/manual payment only; checkout is an order form
- **No customer accounts** — guest checkout only in V1

## Picking Up As A New Agent

1. Read this file first
2. Read the relevant `specs/SPEC-XX-*.md` for the task
3. Check which branches are merged into `main` vs still open
4. If continuing an unmerged branch: `git checkout feat/<branch>` and read the spec's **Status** section
