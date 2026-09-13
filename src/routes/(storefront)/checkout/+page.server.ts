import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Checkout page just needs store data from layout.
// Cart is client-side so no server data needed beyond what the layout provides.
export const load: PageServerLoad = async ({ locals }) => {
  // store is guaranteed by layout; this page is just a passthrough
  return {};
};
