import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const host = url.host;
  const body = `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' }
  });
};
