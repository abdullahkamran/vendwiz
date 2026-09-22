import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productVariants, productAttributes, stores } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { productSchema } from '$lib/schemas/catalog';
import { nanoid } from 'nanoid';

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

  const [variants, attributes] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id))
  ]);

  // Normalize images from JSONB into a flat array with sortOrder
  type ProductImage = { url: string; alt?: string; order: number };
  const images = ((product.images as ProductImage[]) ?? [])
    .sort((a, b) => a.order - b.order)
    .map((img, i) => ({ url: img.url, sortOrder: i }));

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
    seoTitle,
    seoDescription,
    youtubeUrl,
    isPublished,
    stockQty,
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
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
      youtubeUrl: youtubeUrl || null,
      isPublished,
      stockQty,
      lowStockThreshold,
      // Store images in JSONB
      images: images.map((img, i) => ({ url: img.url, alt: '', order: img.sortOrder ?? i })),
      updatedAt: new Date()
    })
    .where(eq(products.id, params.id))
    .returning();

  // Replace variants: delete all then re-insert
  await db.delete(productVariants).where(eq(productVariants.productId, params.id));
  if (variants.length > 0) {
    await db.insert(productVariants).values(
      variants.map((v) => {
        const variantId = nanoid();
        return {
          id: variantId,
          productId: params.id,
          // optionValueIds must be a string[]. For variants created through the
          // admin form (which doesn't use productOptionGroups), we store the
          // variant's own ID so the PDP legacy matcher
          // (`ids.includes(variant.id)`) can resolve the selection correctly.
          optionValueIds: [variantId],
          label: v.name,
          // Use the stock from the first option; the schema comment explicitly
          // says stockQty is passed through so the handler can preserve it.
          stockQty: v.options[0]?.stockQty ?? 0
        };
      })
    );
  }

  // Replace attributes: delete all then re-insert
  await db.delete(productAttributes).where(eq(productAttributes.productId, params.id));
  if (attributes.length > 0) {
    await db.insert(productAttributes).values(
      attributes.map((a) => ({
        id: nanoid(),
        productId: params.id,
        name: a.name,
        value: a.value
      }))
    );
  }

  const [finalVariants, finalAttributes] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id))
  ]);

  return json({
    ...updated,
    images,
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
