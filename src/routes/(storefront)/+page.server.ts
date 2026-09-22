import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  // store is guaranteed by layout load
  const storeId = locals.storefront!.id;

  // Featured: up to 8 published products, newest first
  const featuredRows = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isPublished, true)))
    .orderBy(desc(products.createdAt))
    .limit(8);

  // Attach first image from JSONB
  type ProductImage = { url: string; alt?: string; order: number };
  const featured = featuredRows.map((p) => {
    const imgs = (p.images as ProductImage[]) ?? [];
    return { ...p, imageUrl: imgs[0]?.url ?? null };
  });

  // All categories for 3-column grid
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .limit(6);

  return { featured, categories: allCategories };
};
