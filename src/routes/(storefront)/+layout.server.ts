import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categories, discountCodes } from '$lib/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.isStorefront || !locals.store) {
    // Not on a storefront subdomain — redirect to the auth flow
    throw redirect(302, `/login`);
  }

  const store = locals.store;

  // Load categories for the nav drawer
  const storeCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, store.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Load one active discount code for the promo banner (first valid one)
  const [promoCode] = await db
    .select({ code: discountCodes.code, value: discountCodes.value, type: discountCodes.type })
    .from(discountCodes)
    .where(
      and(
        eq(discountCodes.storeId, store.id),
        eq(discountCodes.isActive, true)
      )
    )
    .limit(1);

  return {
    store,
    categories: storeCategories,
    promoCode: promoCode ?? null
  };
};
