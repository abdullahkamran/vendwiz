import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { categories, stores } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { reorderSchema } from '$lib/schemas/catalog';

async function getStoreForUser(userId: string) {
  return db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export const PUT: RequestHandler = async ({ request, locals }) => {
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

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  // Batch update sort orders
  await Promise.all(
    parsed.data.map(({ id, sortOrder }) =>
      db
        .update(categories)
        .set({ sortOrder })
        .where(eq(categories.id, id))
    )
  );

  return json({ success: true });
};
