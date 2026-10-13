import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  // Strip a leading '#' that users may copy from the confirmation page's "#ORD-…" display
  const ref = url.searchParams.get('ref')?.toUpperCase().replace(/^#/, '');

  if (!ref) {
    return json({ error: 'ref is required' }, { status: 400 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeId, locals.store.id),
        eq(orders.orderNumber, ref)
      )
    )
    .limit(1);

  if (!order) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch order items from the separate table
  const lineItems = await db
    .select({ title: orderItems.productTitle, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const items = lineItems.map((i) => ({ title: i.title, quantity: i.quantity }));

  return json({
    orderRef: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    items
  });
};
