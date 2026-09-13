# SPEC-02 — Store Configuration

## Overview
Admin settings pages for store branding, social links, policy content (WYSIWYG), and announcement bar. Theme system with CSS variable injection per store.

---

## 1. Settings Routes

All routes under `src/routes/(app)/admin/settings/`.

### `/admin/settings` — General Settings
**File:** `src/routes/(app)/admin/settings/+page.svelte`

Form fields:
- Store name (text, required)
- Logo: current image preview + upload button (POST /api/admin/upload)
- Favicon: current image preview + upload button (POST /api/admin/upload)
- Theme: 3 radio cards (minimal / bold / playful) with visual swatches
- Custom hex color: `<input type="color">` shown only when a custom hex is desired, with text input alongside
- Save button → PUT /api/admin/settings

**File:** `src/routes/(app)/admin/settings/+page.server.ts`
- Load current store data
- Server action for form submission with Zod validation

### `/admin/settings/social` — Social & Contact
**File:** `src/routes/(app)/admin/settings/social/+page.svelte`

Form fields:
- WhatsApp number (international format, e.g. +92300...)
- Instagram handle (@handle or full URL)
- Facebook page URL
- Contact email
- Save button → PUT /api/admin/settings/social

### `/admin/settings/policies` — Store Policies
**File:** `src/routes/(app)/admin/settings/policies/+page.svelte`

4 tabs: Return Policy / Shipping Info / Terms & Conditions / FAQ

Each tab contains:
- Tiptap WYSIWYG editor (rich text: headings, bold, italic, lists, links)
- Save button → PUT /api/admin/policies/[type]

**Tiptap setup** (`src/lib/components/RichEditor.svelte`):
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  export let content = '';
  export let onChange: (html: string) => void = () => {};
  
  let element: HTMLDivElement;
  let editor: Editor;
  
  onMount(() => {
    editor = new Editor({
      element,
      extensions: [StarterKit],
      content,
      onUpdate({ editor }) { onChange(editor.getHTML()); }
    });
  });
  onDestroy(() => editor?.destroy());
</script>
<div bind:this={element} class="rich-editor" />
```

### `/admin/settings/announcement` — Announcement Bar
**File:** `src/routes/(app)/admin/settings/announcement/+page.svelte`

- Toggle switch: enabled/disabled
- Text input: announcement message
- Preview strip showing how it looks
- Save button → PUT /api/admin/settings/announcement

---

## 2. API Routes

### `PUT /api/admin/settings` — Update general settings
**File:** `src/routes/api/admin/settings/+server.ts`
```ts
// Body: { name, logoUrl, faviconUrl, theme, themeCustomHex }
// Auth guard: must be store owner
// Update stores table
```

### `PUT /api/admin/settings/social`
```ts
// Body: { whatsapp, instagram, facebook, contactEmail }
```

### `PUT /api/admin/settings/announcement`
```ts
// Body: { announcementBarText, announcementBarEnabled }
```

### `PUT /api/admin/policies/[type]`
**File:** `src/routes/api/admin/policies/[type]/+server.ts`
```ts
// type: 'return' | 'shipping' | 'terms' | 'faq'
// Body: { content: string }
// Upsert into store_policies
```

### `POST /api/admin/upload`
**File:** `src/routes/api/admin/upload/+server.ts`
```ts
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { nanoid } from 'nanoid';
import path from 'path';

// Accept multipart/form-data with file field
// Save to /uploads/ (create dir if not exists)
// Convert to webp using sharp
// Filename: nanoid() + '.webp'
// Return: { url: '/uploads/filename.webp' }
```
Mount `/uploads/` as static files in `svelte.config.js` or serve via a GET route.

---

## 3. Theme System — CSS Variable Injection

### `src/hooks.server.ts` extension
In the `resolve` call, inject per-store CSS variables:

```ts
return resolve(event, {
  transformPageChunk: ({ html }) => {
    if (!event.locals.store) return html;
    const store = event.locals.store;
    const vars = getThemeVars(store);
    return html.replace(
      '<body',
      `<style>:root{${vars}}</style><body`
    );
  }
});
```

### `src/lib/theme.ts`
```ts
import type { Store } from '$lib/db/schema';

const themes = {
  minimal: {
    '--color-primary': '#000000',
    '--color-accent': '#000000',
    '--color-bg': '#ffffff',
    '--color-surface': '#f5f5f5',
    '--radius': '4px'
  },
  bold: {
    '--color-primary': '#1a1a2e',
    '--color-accent': '#e94560',
    '--color-bg': '#f8f8f8',
    '--color-surface': '#ffffff',
    '--radius': '0px'
  },
  playful: {
    '--color-primary': '#6c63ff',
    '--color-accent': '#ff6584',
    '--color-bg': '#fefefe',
    '--color-surface': '#f0f0ff',
    '--radius': '16px'
  }
};

export function getThemeVars(store: Store): string {
  const base = themes[store.theme] ?? themes.minimal;
  const overrides = store.themeCustomHex
    ? { '--color-accent': store.themeCustomHex, '--color-primary': store.themeCustomHex }
    : {};
  const merged = { ...base, ...overrides };
  return Object.entries(merged).map(([k, v]) => `${k}:${v}`).join(';');
}
```

---

## 4. Zod Schemas

`src/lib/schemas/settings.ts`:
```ts
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  theme: z.enum(['minimal', 'bold', 'playful']),
  themeCustomHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal(''))
});

export const socialSettingsSchema = z.object({
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal(''))
});

export const announcementSchema = z.object({
  announcementBarText: z.string().max(200),
  announcementBarEnabled: z.boolean()
});

export const policySchema = z.object({
  content: z.string()
});
```

---

## 5. Settings Sidebar Navigation

Add a sub-nav within the settings section:
- General (`/admin/settings`)
- Social & Contact (`/admin/settings/social`)
- Policies (`/admin/settings/policies`)
- Announcement (`/admin/settings/announcement`)

Use a secondary sidebar or tab strip inside the settings layout.
