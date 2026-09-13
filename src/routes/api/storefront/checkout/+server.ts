import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { orders, discountCodes, shippingConfig, products } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { checkoutSchema } from '$lib/schemas/storefront';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.store) {
    throw error(404, 'Store not found');
  }

  const storeId = locals.store.id;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON');
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 422 });
  }

  const { customerName, customerPhone, customerEmail, shippingAddress, notes, discountCode, items } =
    parsed.data;

  // Load shipping config
  const [shipping] = await db
    .select()
    .from(shippingConfig)
    .where(eq(shippingConfig.storeId, storeId))
    .limit(1);

  const flatRate = Number(shipping?.flatRate ?? 0);
  const freeThreshold = shipping?.freeShippingThreshold
    ? Number(shipping.freeShippingThreshold)
    : null;
  const taxRate = Number(shipping?.taxRate ?? 0);

  // Re-calculate subtotal server-side from DB prices
  // Fetch actual prices to prevent client-side price tampering
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Shipping fee
  const shippingFee = freeThreshold !== null && subtotal >= freeThreshold ? 0 : flatRate;

  // Tax
  const taxAmount = subtotal * taxRate;

  // Discount
  let discountAmount = 0;
  let appliedDiscountCode: string | undefined;
  let discountCodeId: string | undefined;

  if (discountCode) {
    const [dc] = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.storeId, storeId),
          eq(discountCodes.code, discountCode.toUpperCase()),
          eq(discountCodes.isActive, true)
        )
      )
      .limit(1);

    if (dc) {
      // Check usage limit
      const withinLimit = dc.usageLimit === null || dc.usageCount < dc.usageLimit;
      // Check expiry
      const notExpired = !dc.expiresAt || dc.expiresAt > new Date();

      if (withinLimit && notExpired) {
        discountAmount =
          dc.type === 'percent'
            ? (subtotal * Number(dc.value)) / 100
            : Math.min(Number(dc.value), subtotal);
        appliedDiscountCode = dc.code;
        discountCodeId = dc.id;
      }
    }
  }

  // Total
  const total = Math.max(0, subtotal + shippingFee + taxAmount - discountAmount);

  // Generate order reference
  const orderRef = nanoid(8).toUpperCase();

  // Insert order
  await db.insert(orders).values({
    storeId,
    orderRef,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    items: items as unknown as typeof orders.$inferInsert['items'],
    subtotal: subtotal.toFixed(2),
    shippingFee: shippingFee.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
    discountCode: appliedDiscountCode,
    notes: notes ?? null,
    status: 'pending'
  });

  // Increment discount usage
  if (discountCodeId) {
    await db
      .update(discountCodes)
      .set({ usageCount: sql`${discountCodes.usageCount} + 1` })
      .where(eq(discountCodes.id, discountCodeId));
  }

  // Build WhatsApp URL if store has whatsapp
  let whatsappUrl: string | undefined;
  if (locals.store.whatsapp) {
    const waPhone = locals.store.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `New order #${orderRef} from ${customerName} (${customerPhone}). Total: Rs. ${total.toFixed(0)}`
    );
    whatsappUrl = `https://wa.me/${waPhone}?text=${msg}`;
  }

  return json({ orderRef, whatsappUrl });
};
