import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    store: locals.store,
    isStorefront: locals.isStorefront,
    user: locals.user ?? null
  };
};
