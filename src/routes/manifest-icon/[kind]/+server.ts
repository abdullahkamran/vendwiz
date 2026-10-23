import type { RequestHandler } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { THEME_HEX } from '$lib/theme/tokens';
import { mediaUrl } from '$lib/media';
import { normaliseBase, resolvePwaStore } from '$lib/server/pwaStore';

// Per-store PWA images, rendered from the store's own favicon/logo and name:
//   /manifest-icon/192, /manifest-icon/512            square install icons
//   /manifest-icon/wide, /manifest-icon/narrow        install-dialog screenshots
const SIZES: Record<string, [number, number]> = {
  '192': [192, 192],
  '512': [512, 512],
  wide: [1280, 720],
  narrow: [720, 1280]
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function loadSource(ref: string | null | undefined, origin: string): Promise<Buffer | null> {
  const src = mediaUrl(ref);
  if (!src) return null;
  try {
    if (src.startsWith('/uploads/')) {
      const uploadDir = process.env.UPLOAD_DIR ?? 'static/uploads';
      const root = resolve(join(process.cwd(), uploadDir));
      const file = resolve(join(root, decodeURIComponent(src.slice('/uploads/'.length).split('?')[0])));
      if (!file.startsWith(root + sep)) return null;
      return await readFile(file);
    }
    const abs = src.startsWith('/') ? origin + src : src;
    if (!/^https?:\/\//.test(abs)) return null;
    const res = await fetch(abs, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= 5 * 1024 * 1024 ? buf : null;
  } catch {
    return null;
  }
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const dims = SIZES[params.kind ?? ''];
  if (!dims) return new Response('Not Found', { status: 404 });
  const [w, h] = dims;

  const store = await resolvePwaStore(locals, normaliseBase(url.searchParams.get('base') ?? ''));
  const name = store?.name ?? 'Store';
  const color = THEME_HEX[store?.theme ?? 'basic'] ?? THEME_HEX.basic;

  const sharp = (await import('sharp')).default;
  const isIcon = w === h;

  const logo = await loadSource(store?.faviconUrl || store?.logoUrl, url.origin);

  let png: Buffer;
  if (isIcon) {
    // Maskable-safe: keep the artwork inside the central ~70% on a solid background.
    const inner = Math.round(w * 0.7);
    let layer: Buffer | null = null;
    if (logo) {
      try {
        layer = await sharp(logo, { density: 300 })
          .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      } catch {
        layer = null;
      }
    }
    if (!layer) {
      const initial = esc((name.trim()[0] ?? 'S').toUpperCase());
      layer = await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${inner}" height="${inner}"><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${inner * 0.8}" fill="#fff">${initial}</text></svg>`
        )
      )
        .png()
        .toBuffer();
    }
    png = await sharp({
      create: { width: w, height: h, channels: 4, background: logo ? '#ffffff' : color }
    })
      .composite([{ input: layer, gravity: 'center' }])
      .png()
      .toBuffer();
  } else {
    const logoH = Math.round(h * 0.25);
    let logoLayer: Buffer | null = null;
    if (logo) {
      try {
        logoLayer = await sharp(logo, { density: 300 })
          .resize(logoH, logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      } catch {
        logoLayer = null;
      }
    }
    const fs = Math.round(Math.min(w, h) * 0.08);
    const base = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f8f9fa"/><rect width="${w}" height="${Math.round(h * 0.09)}" fill="${color}"/><text x="${w / 2}" y="${Math.round(h * 0.68)}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${fs}" fill="#212529">${esc(name.slice(0, 28))}</text></svg>`
      )
    )
      .png()
      .toBuffer();
    png = logoLayer
      ? await sharp(base)
          .composite([{ input: logoLayer, left: Math.round((w - logoH) / 2), top: Math.round(h * 0.3) }])
          .png()
          .toBuffer()
      : base;
  }

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' }
  });
};
