import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productVariants, productAttributes, stores } from '$lib/server/db/schema';
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

  // Insert variants
  if (variants.length > 0) {
    await db.insert(productVariants).values(
      variants.map((v) => {
        const variantId = nanoid();
        return {
          id: variantId,
          productId: product.id,
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
