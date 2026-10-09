import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reviews, products } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

  const { productId, reviewerName, reviewerEmail: email, rating, body: reviewBody } = parsed.data;

  // Verify product belongs to this store
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, locals.store.id)))
    .limit(1);

  if (!product) {
    return json({ error: 'Product not found' }, { status: 404 });
  }

  // Uniqueness check: one review per email per product per store (any status).
  // email is always a non-null string here because reviewerEmail is z.string().email()
  // (required) in reviewSchema; the guard was dead code and has been removed so that
  // the check is unconditional and cannot be bypassed by a malformed payload.
  const ip = getClientAddress();
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.productId, productId),
        eq(reviews.storeId, locals.store.id),
        eq(reviews.reviewerEmail, email)
      )
    )
    .limit(1);

  if (existing.length >= 1) {
    return json({ error: 'You have already reviewed this product.' }, { status: 409 });
  }

  await db.insert(reviews).values({
    id: nanoid(),
    productId,
    storeId: locals.store.id,
    reviewerName,
    reviewerEmail: email ?? null,
    rating,
    body: reviewBody ?? null,
    ip,
    status: 'pending'
  });

  return json({ success: true, message: 'Review submitted, pending approval.' });
};
