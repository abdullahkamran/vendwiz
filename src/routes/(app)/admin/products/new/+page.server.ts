import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { categories, stores } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    return redirect(302, '/');
  }

  const store = await db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, locals.user.id))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!store) {
    return redirect(302, '/');
  }

  const allCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.storeId, store.id), eq(categories.isDefault, false)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return { categories: allCategories, store };
};
