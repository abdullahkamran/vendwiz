import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const host = url.host;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /checkout/confirmation',
    `Sitemap: https://${host}/sitemap.xml`
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' }
  });
};
