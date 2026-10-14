import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { findStockIssues } from '$lib/server/cartStock';

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        variantSelections: z.record(z.string(), z.string()).optional()
      })
    )
    .max(100)
});

/** Verifies the cart against current stock so the cart page can block "Proceed to Checkout". */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.isStorefront || !locals.store) {
    throw error(404, 'Store not found');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON');
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    throw error(422, 'Invalid cart');
  }

  const issues = await findStockIssues(locals.store.id, parsed.data.items);
  // Only expose what the customer needs — never how many units are in stock
  return json({
    ok: issues.length === 0,
    issues: issues.map(({ productId, variantSelections, message }) => ({ productId, variantSelections, message }))
  });
};
