import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

/** Escape the five XML-special characters so values are safe inside element text. */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.isStorefront || !locals.store) {
    throw error(404, 'Not found');
  }

  const storeId = locals.store.id;
  // Escape url.host before embedding it in XML to prevent Host-header injection.
  const base = `${url.protocol}//${escapeXml(url.host)}`;

  const publishedProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isPublished, true)));

  const staticUrls = [
    '/',
    '/products',
    '/contact',
    '/policies/return',
    '/policies/shipping',
    '/policies/terms',
    '/policies/faq'
  ].map((path) => `  <url><loc>${base}${path}</loc></url>`);

  const productUrls = publishedProducts.map((p) => {
    const lastmod = p.updatedAt ? `<lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>` : '';
    // Escape p.slug to prevent XML injection from attacker-controlled slug values.
    return `  <url><loc>${base}/products/${escapeXml(p.slug)}</loc>${lastmod}</url>`;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...productUrls,
    '</urlset>'
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  });
};
