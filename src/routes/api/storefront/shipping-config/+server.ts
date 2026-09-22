import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  const store = locals.store;

  // Shipping config is stored directly on the stores row
  return json({
    flatRate: Number(store.shippingFee ?? 0),
    freeShippingThreshold: store.freeShippingThreshold ? Number(store.freeShippingThreshold) : null,
    taxRate: Number(store.taxRate ?? 0)
  });
};
