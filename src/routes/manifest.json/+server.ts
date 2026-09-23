import type { RequestHandler } from '@sveltejs/kit';
import { THEME_HEX } from '$lib/theme/tokens';

export const GET: RequestHandler = async ({ locals }) => {
  const store = locals.store;

  const name = store?.name ?? 'VendWiz Store';
  const theme = store?.theme ?? 'basic';
  const themeColor = THEME_HEX[theme] ?? THEME_HEX.basic;
  const faviconUrl = store?.faviconUrl ?? '/favicon.svg';

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    description: store?.description ?? `Shop at ${name}`,
    start_url: '/',
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
