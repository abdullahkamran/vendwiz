import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { OrderItem } from '$lib/db/schema';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  const ref = url.searchParams.get('ref')?.toUpperCase();
  const email = url.searchParams.get('email')?.toLowerCase().trim();

  if (!ref || !email) {
    return json({ error: 'ref and email are required' }, { status: 400 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeId, locals.store.id),
        eq(orders.orderRef, ref),
        eq(orders.customerEmail, email)
      )
    )
    .limit(1);

  if (!order) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // Return only public-safe fields (no financial data)
  const items = (order.items as OrderItem[]).map((i) => ({
    title: i.title,
    quantity: i.quantity
  }));

  return json({
    orderRef: order.orderRef,
    status: order.status,
    createdAt: order.createdAt,
    items
  });
};
