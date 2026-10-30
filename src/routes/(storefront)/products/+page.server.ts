import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, categories, productOptionGroups, productVariants } from '$lib/server/db/schema';
import { eq, and, ilike, lte, asc, desc, gt, isNotNull, sql, inArray } from 'drizzle-orm';

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ locals, url }) => {
  const storeId = locals.store!.id;

  const q = url.searchParams.get('q') ?? '';
  // One or more categories, comma-separated: ?category=a or ?category=a,b
  const categoryIds = [...new Set((url.searchParams.get('category') ?? '').split(',').map((c) => c.trim()).filter(Boolean))];
  const maxPrice = url.searchParams.get('maxPrice');
  const inStockOnly = url.searchParams.get('inStock') === '1';
  const onSaleOnly = url.searchParams.get('onSale') === '1';
  const sort = url.searchParams.get('sort') ?? 'newest';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build where conditions
  const conditions = [eq(products.storeId, storeId), eq(products.isPublished, true)];
  if (q) conditions.push(ilike(products.title, `%${q}%`));
  if (categoryIds.length > 0) {
    // Products in any selected category or any of their direct children, so picking a parent
    // category also shows products assigned to its subcategories.
    const childRows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(inArray(categories.parentId, categoryIds), eq(categories.storeId, storeId)));
    conditions.push(inArray(products.categoryId, [...categoryIds, ...childRows.map((r) => r.id)]));
  }
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
  // Products with option groups or variants need a selection on the details page
  const pageProductIds = rows.map((p) => p.id);
  const [groupRows, variantRows] = pageProductIds.length
    ? await Promise.all([
        db
          .selectDistinct({ productId: productOptionGroups.productId })
          .from(productOptionGroups)
          .where(inArray(productOptionGroups.productId, pageProductIds)),
        db
          .selectDistinct({ productId: productVariants.productId })
          .from(productVariants)
          .where(inArray(productVariants.productId, pageProductIds))
      ])
    : [[], []];
  const needsSelection = new Set([...groupRows, ...variantRows].map((r) => r.productId));

  const items = rows.map((p) => {
    const imgs = (p.images as ProductImage[]) ?? [];
    return { ...p, imageUrl: imgs[0]?.url ?? null, hasVariants: needsSelection.has(p.id) };
  });

  // All store categories for filter sheet
  const allCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.storeId, storeId), eq(categories.isDefault, false)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return {
    items,
    categories: allCategories,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    filters: { q, categoryIds, maxPrice: maxPrice ?? '', inStockOnly, onSaleOnly, sort }
  };
};
