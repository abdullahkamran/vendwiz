import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productVariants, productAttributes, productOptionGroups, productOptionValues, stores } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
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

  const [variants, attributes, optionGroups] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
    db.select().from(productAttributes).where(eq(productAttributes.productId, params.id)),
    db.select().from(productOptionGroups).where(eq(productOptionGroups.productId, params.id))
  ]);

  // Load option values for each group
  const groupsWithValues = await Promise.all(
    optionGroups.map(async (g) => {
      const vals = await db.select().from(productOptionValues).where(eq(productOptionValues.groupId, g.id));
      return { ...g, values: vals };
    })
  );

  // Normalize images from JSONB into a flat array with sortOrder
  type ProductImage = { url: string; alt?: string; order: number };
  const images = ((product.images as ProductImage[]) ?? [])
    .sort((a, b) => a.order - b.order)
    .map((img, i) => ({ url: img.url, sortOrder: i }));

  return json({ ...product, images, variants, attributes, optionGroups: groupsWithValues });
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
    const messages = parsed.error.issues
      .map((i) => `${i.path.map(String).join('.') || 'field'}: ${i.message}`)
      .join('; ');
    return json({ error: messages }, { status: 400 });
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

  // Enforce slug uniqueness within the store, excluding this product's own row
  const slugConflict = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, store.id), eq(products.slug, slug), ne(products.id, params.id)))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (slugConflict) {
    return json({ error: 'A product with this slug already exists in your store.' }, { status: 400 });
  }

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

  // Replace option groups, option values, and variants: delete all then re-insert
  // with correct optionValueIds so the PDP matchedVariant lookup works.
  await db.delete(productOptionGroups).where(eq(productOptionGroups.productId, params.id));
  await db.delete(productVariants).where(eq(productVariants.productId, params.id));
  if (variants.length > 0) {
    for (const v of variants) {
      const groupId = nanoid();
      await db.insert(productOptionGroups).values({
        id: groupId,
        productId: params.id,
        name: v.name,
        sortOrder: variants.indexOf(v)
      });

      const isColor = /colou?r/i.test(v.name);

      for (let oi = 0; oi < v.options.length; oi++) {
        const opt = v.options[oi];
        const valueId = nanoid();
        // For colour groups: value = hex so the PDP swatch renders background:{val.value};
        // label = human-readable name ("Red") for display in cart and order summaries.
        // For other groups: value = label text; label mirrors it for consistent lookup.
        const storedValue = isColor ? (opt.colorHex ?? opt.label) : opt.label;

        await db.insert(productOptionValues).values({
          id: valueId,
          groupId,
          value: storedValue,
          label: opt.label,
          sortOrder: oi
        });

        const priceModifier = opt.price_modifier ?? 0;
        await db.insert(productVariants).values({
          id: nanoid(),
          productId: params.id,
          optionValueIds: [valueId],
          label: opt.label,
          price: priceModifier !== 0 ? String(basePrice + priceModifier) : null,
          stockQty: opt.stockQty ?? 0,
          sizeChartUrl: v.sizeChartUrl || null
        });
      }
    }
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
