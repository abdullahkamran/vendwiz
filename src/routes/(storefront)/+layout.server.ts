import type { LayoutServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { deriveBasePath } from '$lib/utils/storefront-path';
import { storeHasReels } from '$lib/server/productReels';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.isStorefront || !locals.store) {
    // Not on a storefront subdomain — redirect to the auth flow
    throw redirect(302, `/login`);
  }

  const store = locals.store;

  if (store.isActive === false) throw error(404, 'Store not found');

  // Load categories for the nav drawer
  const storeCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.storeId, store.id), eq(categories.isDefault, false)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Reels only appear in the menus once the store has at least one reel to show
  const hasReelsPromise = storeHasReels(store.id);

  // Derive basePath: non-empty only on path-based access (e.g. /store/mystore).
  // On subdomain access the original pathname is / or /products etc., so no match.
  const basePath = deriveBasePath(url.pathname);

  return {
    store,
    categories: storeCategories,
    hasReels: await hasReelsPromise,
    basePath
  };
};
