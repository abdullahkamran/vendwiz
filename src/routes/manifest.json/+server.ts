import type { RequestHandler } from '@sveltejs/kit';
import { THEME_HEX } from '$lib/theme/tokens';
import { normaliseBase, resolvePwaStore } from '$lib/server/pwaStore';

export const GET: RequestHandler = async ({ locals, url }) => {
  const base = normaliseBase(url.searchParams.get('base') ?? '');
  const scopePath = base ? `${base}/` : '/';
  const store = await resolvePwaStore(locals, base);

  const name = store?.name ?? 'VendWiz Store';
  const theme = store?.theme ?? 'basic';
  const themeColor = THEME_HEX[theme] ?? THEME_HEX.basic;

  // Icons/screenshots are rendered per store from its favicon/logo and name.
  // `v` busts caches when the store's branding changes.
  const q = new URLSearchParams();
  if (base) q.set('base', base);
  q.set('v', String(store?.faviconUrl ?? store?.logoUrl ?? store?.name ?? ''));
  const img = (kind: string) => `/manifest-icon/${kind}?${q}`;

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    description: store?.description ?? `Shop at ${name}`,
    id: scopePath,
    start_url: scopePath,
    scope: scopePath,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      { src: img('192'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: img('512'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: img('512'), sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    // Screenshots enable the richer install UI on desktop (wide) and mobile (narrow).
    screenshots: [
      { src: img('wide'), sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
      { src: img('narrow'), sizes: '720x1280', type: 'image/png', form_factor: 'narrow' }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
