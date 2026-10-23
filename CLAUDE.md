# VendWiz

## Uploaded images: store paths, resolve with `mediaUrl()`

Uploads (product, variant, category, Markdown content, logo/favicon images) are saved in the
database as a path relative to the media base, not as a URL:

```
<storeId>/<folder>/<nanoid>.webp      folder = products | variants | categories | content | branding
```

The base is `CDN_BUCKET_BASE_URL` (e.g. `https://cdn.11devs.com/vendwiz`) when
`STORAGE_DRIVER=s3`, or `/uploads` with local storage. See `src/lib/media.ts` and
`src/lib/server/storage/upload.ts`.

Rules:
- **Every place an uploaded image is shown must go through `mediaUrl()`** from `$lib/media`:
  `<img src={mediaUrl(product.imageUrl)} />`. A raw stored path is page-relative and will not load.
  `mediaUrl()` returns external `https://` links, legacy `/uploads/…` paths, `blob:`/`data:` URLs
  and null/empty values unchanged, so it is always safe to wrap.
- Absolute URLs (OG/SEO tags, JSON-LD, emails, server-side fetches): use `absImage(origin, ref)`
  from `$lib/seo`, or `mediaUrl()` then prefix the origin when the result starts with `/`.
- Markdown rendered with markdown-it: wrap the instance with `resolveMarkdownImages(md)`.
- Save uploads only via `saveImage()` / `saveFile()` with `{ storeId, folder }`, and store the
  returned path as-is. Never save a full CDN URL in the database.
- New upload folder: add it to `UPLOAD_FOLDERS` in `src/lib/media.ts` and to `FOLDERS` in
  `scripts/migrate-uploads-to-cdn.mjs`.
- The base is set on the server in the `init` hook of `hooks.server.ts` and passed to the browser
  by the root `+layout.svelte`, so do not read storage env vars in components.
- Server code reads env through `$env/dynamic/private`, not `process.env`: SvelteKit does not put
  `.env` values on `process.env`, so `process.env.STORAGE_DRIVER` etc. are undefined in the app.
