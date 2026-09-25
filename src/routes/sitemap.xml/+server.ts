import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.isStorefront || !locals.store) {
    throw error(404, 'Not found');
  }

  const storeId = locals.store.id;
  const base = `${url.protocol}//${url.host}`;

  const publishedProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isPublished, true)));

  const staticUrls = ['/', '/products', '/cart', '/checkout'].map(
    (path) => `  <url><loc>${base}${path}</loc></url>`
  );

  const productUrls = publishedProducts.map(
    (p) => `  <url><loc>${base}/products/${p.slug}</loc></url>`
  );

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
