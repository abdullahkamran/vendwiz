import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, stores } from '$lib/server/db/schema';
import { eq, and, lte, gt, count, sql } from 'drizzle-orm';

async function getStoreForUser(userId: string) {
  return db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  // Low stock: stockQuantity > 0 AND stockQuantity <= lowStockThreshold
  const [lowStockRow] = await db
    .select({ count: count() })
    .from(products)
    .where(
      and(
        eq(products.storeId, store.id),
        gt(products.stockQty, 0),
        sql`${products.stockQty} <= ${products.lowStockThreshold}`
      )
    );

  // Out of stock: stockQuantity = 0
  const [outOfStockRow] = await db
    .select({ count: count() })
    .from(products)
    .where(
      and(
        eq(products.storeId, store.id),
        eq(products.stockQty, 0)
      )
    );

  return json({
    lowStock: lowStockRow?.count ?? 0,
    outOfStock: outOfStockRow?.count ?? 0
  });
};
