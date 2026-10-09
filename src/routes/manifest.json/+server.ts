import type { RequestHandler } from '@sveltejs/kit';
import { THEME_HEX } from '$lib/theme/tokens';

// Accept only leading-slash paths composed of safe characters; anything else
// falls back to '' so the manifest scope defaults to the origin root.
function normaliseBase(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || !/^\/([A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*)?$/.test(trimmed)) return '';
  return trimmed.replace(/\/+$/, '');
}

export const GET: RequestHandler = async ({ locals, url }) => {
  const store = locals.store;

  const rawBase = url.searchParams.get('base') ?? '';
  const base = normaliseBase(rawBase);
  const scopePath = base ? `${base}/` : '/';

  const name = store?.name ?? 'VendWiz Store';
  const theme = store?.theme ?? 'basic';
  const themeColor = THEME_HEX[theme] ?? THEME_HEX.basic;
  const faviconUrl = store?.faviconUrl ?? '/favicon.svg';

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    description: store?.description ?? `Shop at ${name}`,
    start_url: scopePath,
    scope: scopePath,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: faviconUrl,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
