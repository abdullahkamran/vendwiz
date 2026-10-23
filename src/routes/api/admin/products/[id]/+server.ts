import { sumFirstGroupStock } from '$lib/utils/stock';
import { syncProductReels } from '$lib/server/productReels';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productVariants, productAttributes, productOptionGroups, productOptionValues, orderItems, stores } from '$lib/server/db/schema';
import { getDefaultProduct, repointOrderLinesToDefaultVariant } from '$lib/server/defaults';
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
    salePrice,
    description,
    seoTitle,
    seoDescription,
    youtubeUrl,
    isPublished,
    stockQty,
    lowStockThreshold,
    images,
    variants,
    attributes,
    reels
  } = parsed.data;

  if (salePrice !== null && salePrice !== undefined && salePrice >= basePrice) {
    return json({ error: 'Sale price must be lower than the regular price.' }, { status: 400 });
  }

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

  let updated: (typeof products.$inferSelect) | undefined;
  let finalVariants: (typeof productVariants.$inferSelect)[];
  let finalAttributes: (typeof productAttributes.$inferSelect)[];

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(products)
        .set({
          title,
          slug,
          categoryId: categoryId ?? null,
          basePrice: String(basePrice),
          salePrice: salePrice != null ? String(salePrice) : null,
          description: description ?? null,
          seoTitle: seoTitle ?? null,
          seoDescription: seoDescription ?? null,
          ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
          isPublished,
          // With variants, inventory is the combined stock of the variants, not a separate figure
          stockQty: sumFirstGroupStock(variants) ?? stockQty,
          lowStockThreshold,
          // Store images in JSONB
          images: images.map((img, i) => ({ url: img.url, alt: '', order: img.sortOrder ?? i })),
          updatedAt: new Date()
        })
        .where(eq(products.id, params.id))
        .returning();

      // Past order lines that used one of these variants move to the hidden default variant
      // before the variants are rebuilt below.
      await repointOrderLinesToDefaultVariant(store.id, params.id, tx);

      // Replace option groups, option values, and variants: delete all then re-insert
      // with correct optionValueIds so the PDP matchedVariant lookup works.
      await tx.delete(productOptionGroups).where(eq(productOptionGroups.productId, params.id));
      await tx.delete(productVariants).where(eq(productVariants.productId, params.id));
      if (variants.length > 0) {
        for (const v of variants) {
          const groupId = nanoid();
          await tx.insert(productOptionGroups).values({
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
            // Auto-populate empty labels for colour options from colorHex so that a
            // colour picker interaction (which sets colorHex but leaves label '') does
            // not produce a blank label in the DB or cart summaries.
            const effectiveLabel = isColor && !opt.label && opt.colorHex ? opt.colorHex : opt.label;
            const storedValue = isColor ? (opt.colorHex ?? effectiveLabel) : effectiveLabel;

            await tx.insert(productOptionValues).values({
              id: valueId,
              groupId,
              value: storedValue,
              label: effectiveLabel,
              imageUrl: opt.imageUrl || null,
              sortOrder: oi
            });

            const priceModifier = opt.price_modifier ?? 0;
            await tx.insert(productVariants).values({
              id: nanoid(),
              productId: params.id,
              optionValueIds: [valueId],
              label: effectiveLabel,
              price: priceModifier !== 0 ? String(basePrice + priceModifier) : null,
              stockQty: opt.stockQty ?? 0,
              sizeChartUrl: v.sizeChartUrl || null
            });
          }
        }
      }

      // Replace attributes: delete all then re-insert
      await tx.delete(productAttributes).where(eq(productAttributes.productId, params.id));
      if (attributes.length > 0) {
        await tx.insert(productAttributes).values(
          attributes.map((a) => ({
            id: nanoid(),
            productId: params.id,
            name: a.name,
            value: a.value
          }))
        );
      }

      if (reels) await syncProductReels(tx, store.id, params.id, reels);

      const [txVariants, txAttributes] = await Promise.all([
        tx.select().from(productVariants).where(eq(productVariants.productId, params.id)),
        tx.select().from(productAttributes).where(eq(productAttributes.productId, params.id))
      ]);

      return { row, txVariants, txAttributes };
    });

    updated = result.row;
    finalVariants = result.txVariants;
    finalAttributes = result.txAttributes;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return json({ error: message }, { status: 500 });
  }

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

  if (existing.isDefault) {
    return error(400, 'The default product cannot be deleted');
  }

  // Past order lines that bought this product move to the store's hidden default product, and
  // keep the title / price / image saved on the line. Then hard delete (cascade handles the
  // product's own variants, attributes and reviews).
  await db.transaction(async (tx) => {
    await repointOrderLinesToDefaultVariant(store.id, params.id, tx);
    const fallback = await getDefaultProduct(store.id, tx);
    await tx.update(orderItems).set({ productId: fallback.id }).where(eq(orderItems.productId, params.id));
    await tx.delete(products).where(eq(products.id, params.id));
  });

  return json({ success: true });
};
