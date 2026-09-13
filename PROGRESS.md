# VendWiz — Build Progress

Last updated: 2026-09-14

## Branch Map

| Spec | Branch | Status | Notes |
|---|---|---|---|
| SPEC-01 Auth & Onboarding | `feat/auth-onboarding` | ✅ DONE | Login, register, Google OAuth, onboarding wizard, subdomain claim |
| SPEC-02 Store Config | `feat/store-config` | ✅ DONE | Settings (general, social, policies, announcement), branding, image upload → WebP |
| SPEC-03 Catalog | `feat/catalog` | ✅ DONE | Categories, products, variants, attributes, image upload, inventory tracking |
| SPEC-04 Marketing | `feat/store-config` | ✅ DONE | Discounts (list/create/edit), shipping config — merged into same branch as SPEC-02 |
| SPEC-05 Orders | `feat/orders` | ✅ DONE | Order dashboard, status workflow, WhatsApp notification trigger, review moderation, analytics |
| SPEC-06 Storefront Shell | `feat/storefront` | ✅ DONE | PWA shell, PLP with filters/sort/search, order tracking page |
| SPEC-07 PDP + Cart + Checkout | `feat/storefront` | ✅ DONE | PDP, swipeable gallery, variant selection, cart (localStorage), guest checkout, order confirmation — merged into same branch as SPEC-06 |

## What's Left

1. **Open PRs** — All 5 branches exist but no PRs have been opened yet. Review and merge order matters (auth first, then config, then catalog, then orders, then storefront).
2. **Integration pass** — Branches were built in parallel. After merging, verify:
   - Auth session flows correctly into admin and storefront
   - Cart → Orders pipeline (guest checkout creating an order record)
   - Discount codes applied at checkout match the discount engine in store-config
   - Storefront subdomain routing (`hooks.server.ts`) resolves the correct store
3. **Env / Deploy** — Need Postgres URL, better-auth secrets, Vercel project + subdomain wildcard (`*.vendwiz.com`) configured
4. **WhatsApp** — `feat/orders` has the trigger; needs a real Twilio/WA Cloud API key wired via env var

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
