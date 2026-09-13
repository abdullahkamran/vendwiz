import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { products, productImages, productVariants, productAttributes, stores } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { productSchema } from '$lib/schemas/catalog';

async function getStoreForUser(userId: string) {
  return db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
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

  const [images, variants, attributes] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, params.id)),
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id))
  ]);

  return json({ ...product, images, variants, attributes });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  const existing = await db
    .select()
    .from(products)
    .where(and(eq(products.id, params.id), eq(products.storeId, store.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) {
    return error(404, 'Product not found');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Invalid JSON');
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const {
    title,
    slug,
    categoryId,
    basePrice,
    description,
    metaTitle,
    metaDescription,
    youtubeUrl,
    isActive,
    stockQuantity,
    lowStockThreshold,
    images,
    variants,
    attributes
  } = parsed.data;

  const [updated] = await db
    .update(products)
    .set({
      title,
      slug,
      categoryId: categoryId ?? null,
      basePrice: String(basePrice),
      description: description ?? null,
      metaTitle: metaTitle ?? null,
      metaDescription: metaDescription ?? null,
      youtubeUrl: youtubeUrl || null,
      isActive,
      stockQuantity,
      lowStockThreshold,
      updatedAt: new Date()
    })
    .where(eq(products.id, params.id))
    .returning();

  // Replace images: delete all then re-insert
  await db.delete(productImages).where(eq(productImages.productId, params.id));
  if (images.length > 0) {
    await db.insert(productImages).values(
      images.map((img) => ({
        productId: params.id,
        url: img.url,
        sortOrder: img.sortOrder
      }))
    );
  }

  // Replace variants: delete all then re-insert
  await db.delete(productVariants).where(eq(productVariants.productId, params.id));
  if (variants.length > 0) {
    await db.insert(productVariants).values(
      variants.map((v) => ({
        productId: params.id,
        name: v.name,
        options: v.options
      }))
    );
  }

  // Replace attributes: delete all then re-insert
  await db.delete(productAttributes).where(eq(productAttributes.productId, params.id));
  if (attributes.length > 0) {
    await db.insert(productAttributes).values(
      attributes.map((a) => ({
        productId: params.id,
        name: a.name,
        value: a.value
      }))
    );
  }

  const [finalImages, finalVariants, finalAttributes] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, params.id)),
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id))
  ]);

  return json({
    ...updated,
    images: finalImages,
    variants: finalVariants,
    attributes: finalAttributes
  });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  const existing = await db
    .select()
    .from(products)
    .where(and(eq(products.id, params.id), eq(products.storeId, store.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) {
    return error(404, 'Product not found');
  }

  // Hard delete (cascade handles related records)
  await db.delete(products).where(eq(products.id, params.id));

  return json({ success: true });
};
