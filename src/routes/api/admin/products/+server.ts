import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productVariants, productAttributes, productOptionGroups, productOptionValues, stores } from '$lib/server/db/schema';
import { eq, and, ilike, count, desc } from 'drizzle-orm';
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

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  const search = url.searchParams.get('search') ?? '';
  const categoryId = url.searchParams.get('category') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const conditions = [eq(products.storeId, store.id)];
  if (search) conditions.push(ilike(products.title, `%${search}%`));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (status === 'active') conditions.push(eq(products.isPublished, true));
  else if (status === 'inactive') conditions.push(eq(products.isPublished, false));

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(products)
    .where(where);

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  // Primary image comes from the JSONB images array (no productImages table)
  type ProductImage = { url: string; alt?: string; order: number };
  const data = rows.map((p) => {
    const imgs = ((p.images as ProductImage[]) ?? []).sort((a, b) => a.order - b.order);
    return { ...p, primaryImage: imgs[0]?.url ?? null };
  });

  return json({
    data,
    total: totalRow?.count ?? 0,
    page,
    limit,
    pages: Math.ceil((totalRow?.count ?? 0) / limit)
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
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

  // Enforce slug uniqueness within the store
  const slugConflict = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, store.id), eq(products.slug, slug)))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (slugConflict) {
    return json({ error: 'A product with this slug already exists in your store.' }, { status: 400 });
  }

  const id = nanoid();

  const [product] = await db
    .insert(products)
    .values({
      id,
      storeId: store.id,
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
      images: images.map((img, i) => ({ url: img.url, alt: '', order: img.sortOrder ?? i }))
    })
    .returning();

  // Insert option groups, option values, and variants with correct optionValueIds
  // so the storefront matchedVariant derived store can find a match when a colour
  // (or other option) is selected.
  if (variants.length > 0) {
    for (const v of variants) {
      const groupId = nanoid();
      await db.insert(productOptionGroups).values({
        id: groupId,
        productId: product.id,
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

        // One productVariants row per option value — optionValueIds = [valueId]
        // so the PDP matchedVariant check (selectedIds.every(id => ids.includes(id)))
        // can find a match when that option is selected.
        const priceModifier = opt.price_modifier ?? 0;
        await db.insert(productVariants).values({
          id: nanoid(),
          productId: product.id,
          optionValueIds: [valueId],
          label: opt.label,
          price: priceModifier !== 0 ? String(basePrice + priceModifier) : null,
          stockQty: opt.stockQty ?? 0,
          sizeChartUrl: v.sizeChartUrl || null
        });
      }
    }
  }

  // Insert attributes
  if (attributes.length > 0) {
    await db.insert(productAttributes).values(
      attributes.map((a) => ({
        id: nanoid(),
        productId: product.id,
        name: a.name,
        value: a.value
      }))
    );
  }

  return json({ ...product }, { status: 201 });
};
