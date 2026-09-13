import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { categories } from '$lib/db/schema';
import { eq, isNull, asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.store || !locals.isStorefront) {
    throw error(404, 'Store not found');
  }

  // Load root categories for the nav dropdown
  const rootCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, locals.store.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return {
    store: locals.store,
    categories: rootCategories
  };
};
