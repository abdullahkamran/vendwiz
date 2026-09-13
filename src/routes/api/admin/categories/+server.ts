import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { categories, stores } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { categorySchema } from '$lib/schemas/catalog';

async function getStoreForUser(userId: string) {
  const store = await db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .limit(1)
    .then((r) => r[0] ?? null);
  return store;
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const store = await getStoreForUser(locals.user.id);
  if (!store) {
    return error(404, 'Store not found');
  }

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, store.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return json(rows);
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

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { name, slug, parentId, sortOrder } = parsed.data;

  const [created] = await db
    .insert(categories)
    .values({
      storeId: store.id,
      name,
      slug,
      parentId: parentId ?? null,
      sortOrder: sortOrder ?? 0
    })
    .returning();

  return json(created, { status: 201 });
};
