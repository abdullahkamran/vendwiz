import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  categories,
  products,
  productVariants,
  productAttributes,
  productOptionGroups,
  productOptionValues,
  stores
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    return redirect(302, '/');
  }

  const store = await db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, locals.user.id))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!store) {
    return redirect(302, '/');
  }

  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, params.id), eq(products.storeId, store.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!product) {
    return error(404, 'Product not found');
  }

  // Images are stored in products.images JSONB column
  type ProductImage = { url: string; alt?: string; order: number };
  const rawImages = ((product.images as ProductImage[]) ?? []).sort((a, b) => a.order - b.order);
  const images = rawImages.map((img, i) => ({ id: undefined, url: img.url, sortOrder: i }));

  const [variants, attributes, allCategories, optionGroupRows] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id)),
    db.select().from(categories).where(eq(categories.storeId, store.id)).orderBy(asc(categories.sortOrder)),
    db.select().from(productOptionGroups).where(eq(productOptionGroups.productId, params.id))
  ]);

  // Load option values for each group (mirrors api/admin/products/[id]/+server.ts GET)
  const optionGroups = await Promise.all(
    optionGroupRows.map(async (g) => {
      const vals = await db.select().from(productOptionValues).where(eq(productOptionValues.groupId, g.id));
      return { ...g, values: vals };
    })
  );

  return {
    product,
    images,
    variants,
    attributes,
    optionGroups,
    categories: allCategories,
    store
  };
};
