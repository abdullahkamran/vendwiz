import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import {
  products,
  productImages,
  productVariants,
  productAttributes,
  reviews,
  categories
} from '$lib/db/schema';
import { eq, and, ne, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
  const storeId = locals.store!.id;

  // Load product by slug + storeId
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.slug, params.slug)))
    .limit(1);

  if (!product || !product.isActive) {
    throw error(404, 'Product not found');
  }

  // Load images, variants, attributes in parallel
  const [images, variants, attributes, approvedReviews] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.sortOrder),
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, product.id)),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt))
  ]);

  // Related products (same category, exclude current, limit 4)
  let related: typeof products.$inferSelect[] & { imageUrl: string | null }[] = [];
  if (product.categoryId) {
    const relatedRows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.categoryId, product.categoryId),
          ne(products.id, product.id),
          eq(products.isActive, true)
        )
      )
      .limit(4);

    related = await Promise.all(
      relatedRows.map(async (p) => {
        const [img] = await db
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.productId, p.id))
          .orderBy(productImages.sortOrder)
          .limit(1);
        return { ...p, imageUrl: img?.url ?? null };
      })
    );
  }

  return { product, images, variants, attributes, reviews: approvedReviews, related };
};
