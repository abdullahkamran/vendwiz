import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { products, productImages, productVariants, productAttributes, stores } from '$lib/db/schema';
import { eq, and, ilike, count, asc, desc, sql } from 'drizzle-orm';
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
  if (search) {
    conditions.push(ilike(products.title, `%${search}%`));
  }
  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  }
  if (status === 'active') {
    conditions.push(eq(products.isActive, true));
  } else if (status === 'inactive') {
    conditions.push(eq(products.isActive, false));
  }

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

  // Load primary image for each product
  const productIds = rows.map((p) => p.id);
  let primaryImages: Record<string, string> = {};
  if (productIds.length > 0) {
    const images = await db
      .select()
      .from(productImages)
      .where(
        and(
          sql`${productImages.productId} = ANY(${sql.raw(`ARRAY[${productIds.map((id) => `'${id}'`).join(',')}]`)})`,
          eq(productImages.sortOrder, 0)
        )
      );
    for (const img of images) {
      primaryImages[img.productId] = img.url;
    }
  }

  const data = rows.map((p) => ({
    ...p,
    primaryImage: primaryImages[p.id] ?? null
  }));

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

  const [product] = await db
    .insert(products)
    .values({
      storeId: store.id,
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
      lowStockThreshold
    })
    .returning();

  // Insert images
  if (images.length > 0) {
    await db.insert(productImages).values(
      images.map((img) => ({
        productId: product.id,
        url: img.url,
        sortOrder: img.sortOrder
      }))
    );
  }

  // Insert variants
  if (variants.length > 0) {
    await db.insert(productVariants).values(
      variants.map((v) => ({
        productId: product.id,
        name: v.name,
        options: v.options
      }))
    );
  }

  // Insert attributes
  if (attributes.length > 0) {
    await db.insert(productAttributes).values(
      attributes.map((a) => ({
        productId: product.id,
        name: a.name,
        value: a.value
      }))
    );
  }

  return json({ ...product }, { status: 201 });
};
