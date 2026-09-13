import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { products, productImages, categories } from '$lib/db/schema';
import { eq, and, ilike, gte, lte, asc, desc } from 'drizzle-orm';

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ locals, url }) => {
  const storeId = locals.store!.id;

  const q = url.searchParams.get('q') ?? '';
  const categoryId = url.searchParams.get('category') ?? '';
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const sort = url.searchParams.get('sort') ?? 'newest';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build where conditions
  const conditions = [eq(products.storeId, storeId), eq(products.isActive, true)];
  if (q) conditions.push(ilike(products.title, `%${q}%`));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (minPrice) conditions.push(gte(products.basePrice, minPrice));
  if (maxPrice) conditions.push(lte(products.basePrice, maxPrice));

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

  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset(offset);

  // Attach first image
  const items = await Promise.all(
    rows.map(async (p) => {
      const [img] = await db
        .select({ url: productImages.url })
        .from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(productImages.sortOrder)
        .limit(1);
      return { ...p, imageUrl: img?.url ?? null };
    })
  );

  // All store categories for sidebar
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Total count for pagination (simple approach — re-query without limit)
  const totalRows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions));
  const total = totalRows.length;

  return {
    items,
    categories: allCategories,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    filters: { q, categoryId, minPrice: minPrice ?? '', maxPrice: maxPrice ?? '', sort }
  };
};
