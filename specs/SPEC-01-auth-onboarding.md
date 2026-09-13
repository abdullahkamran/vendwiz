# SPEC-01 — Auth & Onboarding

## Overview
Set up better-auth for email/password + Google OAuth, build login/register pages, and a 3-step onboarding wizard that runs once after first login.

---

## 1. Better-Auth Setup

### `src/lib/auth.ts`
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { env } from '$env/dynamic/private';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 5 }
  }
});

export type Auth = typeof auth;
```

### `src/routes/api/auth/[...all]/+server.ts`
```ts
import { auth } from '$lib/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => auth.handler(request);
export const POST: RequestHandler = ({ request }) => auth.handler(request);
```

### Wire session into `src/hooks.server.ts`
Import auth and add session handler to the sequence:
```ts
import { auth } from '$lib/auth';

const session: Handle = async ({ event, resolve }) => {
  const sessionData = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = sessionData?.user
    ? { id: sessionData.user.id, email: sessionData.user.email, name: sessionData.user.name }
    : null;
  return resolve(event);
};

export const handle = sequence(subdomain, session);
```

---

## 2. Auth Pages

### `src/routes/(auth)/login/+page.svelte`
- Email + password form
- Google OAuth button (call `signIn.social({ provider: 'google' })`)
- Link to /register
- On submit: call `signIn.email({ email, password })` from `better-auth/svelte`
- Show Zod errors inline
- On success: redirect to `/admin` (or `/onboarding` if store not set up)

### `src/routes/(auth)/login/+page.server.ts`
- Zod schema: `{ email: z.string().email(), password: z.string().min(8) }`
- Server action for progressive enhancement

### `src/routes/(auth)/register/+page.svelte`
- Name, email, password, confirm password fields
- Zod validation: name ≥ 2 chars, email valid, password ≥ 8 chars, passwords match
- Call `signUp.email({ name, email, password })` from `better-auth/svelte`
- On success: redirect to `/onboarding`

### `src/routes/(auth)/register/+page.server.ts`
- Server action with same Zod schema

### Auth layout: `src/routes/(auth)/+layout.svelte`
- Centered card layout, VendWiz logo/wordmark
- No sidebar

---

## 3. Onboarding Wizard (3 Steps)

### `src/routes/(app)/onboarding/+page.svelte`
Multi-step wizard, progress indicator at top (Step 1 of 3).

**Step 1 — License Verification**
- Single input: license code
- POST to `/api/admin/onboarding/verify-license`
- API checks code against env var `VALID_LICENSE_CODES` (comma-separated) or a `license_codes` table
- On valid: advance to step 2
- On invalid: show error message

**Step 2 — Claim Subdomain**
- Input: subdomain (lowercase letters, numbers, hyphens only)
- Real-time availability check: GET `/api/admin/onboarding/check-subdomain?sub=xxx`
- Show ✓ available / ✗ taken
- On submit: POST `/api/admin/onboarding/claim-subdomain`
- Creates the store record with `onboarding_complete: false`

**Step 3 — Store Branding**
- Store name (text)
- Logo upload (image, POST to /api/admin/upload, preview inline)
- Favicon upload (image, POST to /api/admin/upload)
- Theme selection: 3 cards for minimal/bold/playful with visual preview
- Custom hex color input (shown when theme selected)
- On submit: PATCH `/api/admin/onboarding/complete`
  - Updates store: name, logo_url, favicon_url, theme, theme_custom_hex, onboarding_complete = true
- Redirect to `/admin`

### Guards
- `/onboarding` is only accessible to authenticated users without a complete store
- Any `/admin/*` route: redirect to `/onboarding` if `store.onboarding_complete === false`
- Any auth page: redirect to `/admin` if already logged in

### `src/routes/(app)/onboarding/+page.server.ts`
- Load: check auth + store state, redirect if already complete

### API routes needed:
- `POST /api/admin/onboarding/verify-license`
- `GET /api/admin/onboarding/check-subdomain`
- `POST /api/admin/onboarding/claim-subdomain`
- `PATCH /api/admin/onboarding/complete`

---

## 4. Admin Layout

### `src/routes/(app)/admin/+layout.svelte`
- Sidebar nav with items:
  - Dashboard → `/admin`
  - Products → `/admin/products`
  - Categories → `/admin/categories`
  - Orders → `/admin/orders`
  - Discounts → `/admin/discounts`
  - Reviews → `/admin/reviews`
  - Analytics → `/admin/analytics`
  - Settings → `/admin/settings`
- Topbar: store name, user avatar/email, logout button
- Mobile: hamburger menu collapsing to icon-only sidebar
- Active route highlighted

### `src/routes/(app)/admin/+layout.server.ts`
- Guard: if `!locals.user` → redirect to `/login`
- If user has no store or `!store.onboarding_complete` → redirect to `/onboarding`
- Return `{ user, store }`

### `src/routes/(app)/admin/+page.svelte`
- Simple dashboard placeholder: "Welcome to VendWiz, [name]"
- Stats cards (orders today, total products, pending reviews) — can be mock data initially

---

## 5. Environment Variables Required
```
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:5173
VALID_LICENSE_CODES=DEMO-1234,DEMO-5678
```

Add `.env.example` with these keys (no values).

---

## 6. TypeScript / Zod Schemas

All form inputs must be validated with Zod. Export schemas from `src/lib/schemas/auth.ts`:

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const subdomainSchema = z.object({
  subdomain: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens')
});
```
