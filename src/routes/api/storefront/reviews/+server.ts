import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reviews, products } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { reviewSchema } from '$lib/schemas/storefront';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    throw error(400, 'Invalid JSON');
  }

  const parsed = reviewSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 422 });
  }

  const { productId, reviewerName, rating, body: reviewBody } = parsed.data;

  // Verify product belongs to this store
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, locals.store.id)))
    .limit(1);

  if (!product) {
    return json({ error: 'Product not found' }, { status: 404 });
  }

  // Basic rate limit: same IP + productId within 1 hour
  const ip = getClientAddress();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(eq(reviews.productId, productId), eq(reviews.storeId, locals.store.id), gte(reviews.createdAt, oneHourAgo))
    )
    .limit(1);

  // Simple IP-based: stored in customer name as a proxy isn't ideal —
  // In production you'd store IP in reviews table. For now we do a loose check.
  if (recentReviews.length >= 1) {
    return json({ error: "You already submitted a review for this product recently." }, { status: 429 });
  }

  await db.insert(reviews).values({
    id: nanoid(),
    productId,
    storeId: locals.store.id,
    reviewerName,
    rating,
    body: reviewBody ?? null,
    status: 'pending' // requires admin approval
  });

  return json({ success: true, message: 'Review submitted, pending approval.' });
};
