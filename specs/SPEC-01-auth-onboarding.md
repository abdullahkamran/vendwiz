# SPEC-01: Auth & Onboarding

**Status: ✅ COMPLETE** — implementation merged into branch, pushed to abdullahkamran/vendwiz.

## Goal
Implement authentication pages and the store creation / onboarding flow.

## Stack
- SvelteKit 2 + Svelte 5 (runes syntax: `$props()`, `$state()`, `$derived()`, `$effect()`)
- better-auth for auth (client: `$lib/auth-client.ts`, API handler at `/api/auth/[...all]`)
- Drizzle ORM + PostgreSQL (`$lib/server/db`)
- Tailwind CSS v4 + plain CSS modules
- Zod for validation
- **Model**: claude-sonnet-4-6

## Routes to implement

### `/login` — `src/routes/(app)/login/`
- `+page.svelte`: Login form (email + password) + Google OAuth button
- `+page.server.ts`: Redirect to `/admin` if already authenticated
- On success → redirect to `/admin`

### `/register` — `src/routes/(app)/register/`
- `+page.svelte`: Sign up form (name, email, password)
- `+page.server.ts`: Check if user already has a store; if yes redirect to `/admin`
- On success → redirect to `/onboarding`

### `/onboarding` — `src/routes/(app)/onboarding/`
Multi-step wizard (3 steps):

**Step 1 — Enter Verification Code**
- Input field for the license key code
- On submit: POST `/api/onboarding/verify-code` which validates the code against `license_keys` table (must exist, not already used)
- Store validated code in session/cookie for next steps

**Step 2 — Claim Subdomain**
- Input for subdomain (lowercase alphanumeric + hyphens, 3-30 chars)
- Real-time availability check: GET `/api/onboarding/check-subdomain?q=mystore`
- Shows green ✓ or red ✗ feedback

**Step 3 — Store Name & Basic Info**
- Store name (required)
- Store description (optional)
- Submit button creates the store record, marks license key as used, sets `isActive: true`
- Redirect to `/admin` on success

## API endpoints needed
- `POST /api/onboarding/verify-code` — validate license key
- `GET /api/onboarding/check-subdomain` — check availability
- `POST /api/onboarding/create-store` — create store, consume license key

## DB operations
- `license_keys` table: read, mark as used
- `stores` table: insert new store, link to owner

## Auth guard
- `/onboarding/*` and `/admin/*` require authenticated session
- Redirect to `/login` if not authenticated
- Guard implemented in `+page.server.ts` or layout server load

## Style guide
- Clean, minimal white UI
- Primary color: `#1a1a2e`, accent: `#e94560`
- Use `var(--color-*)` CSS variables defined in `app.css`
- Forms: max-width 440px, centered, with card shadow
- Input: `w-full border border-[--color-border] rounded-lg px-4 py-2.5 text-sm`
- Primary button: `bg-[--color-accent] text-white px-6 py-2.5 rounded-lg font-medium`

## Validation rules
- Email: valid email format
- Password: min 8 chars
- Subdomain: `/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/` (3-30 chars, start/end alphanumeric)
- Store name: 2-60 chars
- All Zod schemas, validated server-side with form action errors returned as `{ error: string }`

## Error handling
- Return `{ error: "message" }` from form actions, display inline in form
- Show loading states on submit buttons

## File structure
```
src/routes/(app)/
  login/
    +page.svelte
    +page.server.ts
  register/
    +page.svelte
    +page.server.ts
  onboarding/
    +page.svelte          (wizard shell, step state)
    +page.server.ts       (guard: must be logged in; action: create-store)
    Step1Verify.svelte
    Step2Subdomain.svelte
    Step3StoreName.svelte
src/routes/api/onboarding/
  verify-code/+server.ts
  check-subdomain/+server.ts
```
