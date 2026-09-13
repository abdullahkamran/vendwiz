import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { categories, products, stores } from '$lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { categorySchema } from '$lib/schemas/catalog';

async function getStoreForUser(userId: string) {
  return db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  // Verify category belongs to this store
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, params.id), eq(categories.storeId, store.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) {
    return error(404, 'Category not found');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Invalid JSON');
  }

  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const [updated] = await db
    .update(categories)
    .set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.slug !== undefined && { slug: parsed.data.slug }),
      ...(parsed.data.parentId !== undefined && { parentId: parsed.data.parentId }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder })
    })
    .where(eq(categories.id, params.id))
    .returning();

  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  // Verify category belongs to this store
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, params.id), eq(categories.storeId, store.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) {
    return error(404, 'Category not found');
  }

  // Prevent deletion if products are assigned
  const [productCount] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.categoryId, params.id));

  if ((productCount?.count ?? 0) > 0) {
    return json(
      { error: 'Cannot delete category with assigned products. Reassign products first.' },
      { status: 409 }
    );
  }

  await db.delete(categories).where(eq(categories.id, params.id));

  return json({ success: true });
};
