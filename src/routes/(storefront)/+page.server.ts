import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { products, productImages } from '$lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  // store is guaranteed by layout load — locals.store is set
  const storeId = locals.store!.id;

  // Featured: up to 8 active products, newest first
  const featuredRows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      basePrice: products.basePrice,
      stockQuantity: products.stockQuantity,
      createdAt: products.createdAt
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))
    .limit(8);

  // Attach first image for each product
  const featured = await Promise.all(
    featuredRows.map(async (p) => {
      const [img] = await db
        .select({ url: productImages.url })
        .from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(productImages.sortOrder)
        .limit(1);
      return { ...p, imageUrl: img?.url ?? null };
    })
  );

  return { featured };
};
