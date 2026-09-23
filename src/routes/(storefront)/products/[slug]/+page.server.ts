import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  products,
  productVariants,
  productAttributes,
  reviews,
  productOptionGroups,
  productOptionValues
} from '$lib/server/db/schema';
import { eq, and, ne, desc, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
  const storeId = locals.store!.id;

  // Load product by slug + storeId
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.slug, params.slug)))
    .limit(1);

  if (!product || !product.isPublished) {
    throw error(404, 'Product not found');
  }

  // Images are stored in products.images JSONB
  type ProductImage = { url: string; alt?: string; order: number };
  const images = ((product.images as ProductImage[]) ?? []).sort((a, b) => a.order - b.order);

  // Load variants, attributes, approved reviews, option groups
  const [variants, attributes, approvedReviews, optionGroups] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, product.id)).orderBy(asc(productAttributes.sortOrder)),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'approved')))
      .orderBy(desc(reviews.createdAt)),
    db.select().from(productOptionGroups).where(eq(productOptionGroups.productId, product.id)).orderBy(asc(productOptionGroups.sortOrder))
  ]);

  // Load option values for each group
  const groupsWithValues = await Promise.all(
    optionGroups.map(async (g) => {
      const vals = await db
        .select()
        .from(productOptionValues)
        .where(eq(productOptionValues.groupId, g.id))
        .orderBy(asc(productOptionValues.sortOrder));
      return { ...g, values: vals };
    })
  );

  // Related products (same category, exclude current, limit 4)
  let related: (typeof products.$inferSelect & { imageUrl: string | null })[] = [];
  if (product.categoryId) {
    const relatedRows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.categoryId, product.categoryId),
          ne(products.id, product.id),
          eq(products.isPublished, true)
        )
      )
      .limit(4);

    related = relatedRows.map((p) => {
      const imgs = ((p.images as ProductImage[]) ?? []);
      return { ...p, imageUrl: imgs[0]?.url ?? null };
    });
  }

  return { product, images, variants, attributes, optionGroups: groupsWithValues, reviews: approvedReviews, related };
};
