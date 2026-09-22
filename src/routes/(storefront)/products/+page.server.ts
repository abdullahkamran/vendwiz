import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { eq, and, ilike, lte, asc, desc, gt, isNotNull, sql } from 'drizzle-orm';

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ locals, url }) => {
  const storeId = locals.storefront!.id;

  const q = url.searchParams.get('q') ?? '';
  const categoryId = url.searchParams.get('category') ?? '';
  const maxPrice = url.searchParams.get('maxPrice');
  const inStockOnly = url.searchParams.get('inStock') === '1';
  const onSaleOnly = url.searchParams.get('onSale') === '1';
  const sort = url.searchParams.get('sort') ?? 'newest';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build where conditions
  const conditions = [eq(products.storeId, storeId), eq(products.isPublished, true)];
  if (q) conditions.push(ilike(products.title, `%${q}%`));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (maxPrice) conditions.push(lte(products.basePrice, maxPrice));
  // Push in-stock / on-sale as DB-level conditions so count and pagination are accurate
  if (inStockOnly) conditions.push(gt(products.stockQty, 0));
  if (onSaleOnly) conditions.push(isNotNull(products.salePrice));

  // Sort order
  const orderBy =
    sort === 'price_asc'
      ? asc(products.basePrice)
      : sort === 'price_desc'
        ? desc(products.basePrice)
        : sort === 'az'
          ? asc(products.title)
          : sort === 'za'
            ? desc(products.title)
            : desc(products.createdAt); // newest (default)

  // Run count and page rows in parallel — both use the same conditions
  const [countRow, rows] = await Promise.all([
    db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(products)
      .where(and(...conditions))
      .then((r) => r[0]),
    db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(PAGE_SIZE)
      .offset(offset)
  ]);

  const total = countRow?.total ?? 0;

  // Attach first image from JSONB
  type ProductImage = { url: string; alt?: string; order: number };
  const items = rows.map((p) => {
    const imgs = (p.images as ProductImage[]) ?? [];
    return { ...p, imageUrl: imgs[0]?.url ?? null };
  });

  // All store categories for filter sheet
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return {
    items,
    categories: allCategories,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    filters: { q, categoryId, maxPrice: maxPrice ?? '', inStockOnly, onSaleOnly, sort }
  };
};
