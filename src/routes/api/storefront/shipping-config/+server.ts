import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { shippingConfig } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  const [config] = await db
    .select()
    .from(shippingConfig)
    .where(eq(shippingConfig.storeId, locals.store.id))
    .limit(1);

  if (!config) {
    // Return sensible defaults if no config has been set yet
    return json({ flatRate: 0, freeShippingThreshold: null, taxRate: 0 });
  }

  return json({
    flatRate: Number(config.flatRate),
    freeShippingThreshold: config.freeShippingThreshold ? Number(config.freeShippingThreshold) : null,
    taxRate: Number(config.taxRate)
  });
};
