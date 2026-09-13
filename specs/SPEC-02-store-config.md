# SPEC-02: Store Configuration (Admin Settings)

## Goal
Admin settings pages for branding, theme, social links, announcement bar, shipping/taxes, and store policies.

## Stack
- SvelteKit 2 + Svelte 5 (runes)
- Drizzle ORM, `$lib/server/db`
- Tiptap for WYSIWYG policy editors
- File upload for logo/favicon (POST to `/api/upload/image`)
- Tailwind CSS v4
- **Model**: claude-sonnet-4-6

## Route base
`src/routes/(app)/admin/settings/`

All routes require auth + must own an active store. Guard in layout:
`src/routes/(app)/admin/+layout.server.ts` — loads user's store, redirects to `/onboarding` if no store.

## Sub-routes

### `/admin/settings` → redirect to `/admin/settings/branding`

### `/admin/settings/branding`
Fields:
- Store name (text input)
- Store description (textarea)
- Logo upload (image, stored via `/api/upload/image`, max 2MB, resized to 400px wide)
- Favicon upload (image, resized to 64x64)
- Preview of current logo/favicon

Form action: `?/saveBranding`
DB: update `stores` row for ownerId

### `/admin/settings/theme`
- 3 preset theme cards: Minimal / Bold / Playful (visual color swatches)
- "Custom" option expands a color picker section:
  - Primary color (hex input + color picker)
  - Accent color
  - Secondary color
- Live preview iframe or CSS var injection into a mock storefront card
- Form action: `?/saveTheme`

### `/admin/settings/social`
Fields:
- WhatsApp number (with country code, e.g. +92xxxxxxxxxx)
- Instagram URL
- Facebook URL
- Contact email
- Contact phone
DB: update social fields on `stores`

### `/admin/settings/announcement`
- Toggle: enable/disable announcement bar
- Text content (max 200 chars)
- Background color picker
- Text color picker
- Live preview bar
Form action: `?/saveAnnouncement`

### `/admin/settings/shipping`
Fields:
- Flat shipping fee (numeric)
- Free shipping threshold (numeric, optional — leave blank to disable)
- Tax rate (percentage, e.g. 17 for 17%)
- Tax label (text, e.g. "GST", "VAT", "Sales Tax")
Form action: `?/saveShipping`

### `/admin/settings/policies`
Four tabs: Return & Refund | Shipping Info | Terms of Service | FAQ
Each tab:
- Title field
- Tiptap WYSIWYG editor (starter-kit + link extension)
- Save button
DB: upsert `store_policies` (storeId + type as unique key)
Form action per tab: `?/savePolicy`

### `/admin/settings/seo`
- Meta title
- Meta description
- Preview of Google SERP snippet
Form action: `?/saveSeo`

## Shared Admin Layout
`src/routes/(app)/admin/+layout.svelte`:
- Sidebar nav with links to all admin sections
- Top bar with store name + "View Store →" link
- Auth-required guard

## API endpoints
- `POST /api/upload/image` — accepts multipart/form-data, `file` field
  - Validates: image type, max 5MB
  - Calls `saveImage()` from `$lib/server/storage/upload.ts`
  - Returns `{ url: string }`

## Style
- Admin uses a sidebar layout (250px fixed sidebar)
- Content area: max-width 700px, card-style sections with `border border-[--color-border] rounded-xl p-6 mb-6`
- Section headings: `text-lg font-semibold mb-4`
- Settings tabs: horizontal tab strip for policies page
