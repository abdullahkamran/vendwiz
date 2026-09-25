import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { discountCodes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  const storeId = locals.store.id;
  const code = url.searchParams.get('code');

  if (!code) {
    return json({ valid: false, reason: 'No code provided' }, { status: 400 });
  }

  const [dc] = await db
    .select()
    .from(discountCodes)
    .where(
      and(
        eq(discountCodes.storeId, storeId),
        eq(discountCodes.code, code.toUpperCase()),
        eq(discountCodes.isActive, true)
      )
    )
    .limit(1);

  if (!dc) {
    return json({ valid: false, reason: 'Invalid discount code' }, { status: 400 });
  }

  if (dc.expiresAt && dc.expiresAt <= new Date()) {
    return json({ valid: false, reason: 'Discount code has expired' }, { status: 400 });
  }

  if (dc.usageLimit !== null && dc.usageCount >= dc.usageLimit) {
    return json({ valid: false, reason: 'Discount code usage limit reached' }, { status: 400 });
  }

  return json({
    valid: true,
    type: dc.type,
    value: dc.value,
    minOrderAmount: dc.minOrderAmount
  });
};
