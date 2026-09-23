import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, discountCodes, products } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { checkoutSchema } from '$lib/schemas/storefront';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.isStorefront || !locals.store) {
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

  // Load shipping config from the store row (no separate shippingConfig table)
  const flatRate = Number(locals.store.shippingFee ?? 0);
  const freeThreshold = locals.store.freeShippingThreshold
    ? Number(locals.store.freeShippingThreshold)
    : null;
  const taxRate = Number(locals.store.taxRate ?? 0);

  // ── Server-side price enforcement ─────────────────────────────────────────
  // Fetch authoritative prices from the DB.  The query is scoped to the current
  // store so a productId from a different store returns no row.
  const productIds = items.map((i) => i.productId);
  const dbProducts = await db
    .select({
      id: products.id,
      basePrice: products.basePrice,
      salePrice: products.salePrice,
      isPublished: products.isPublished
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, productIds)));

  // Build a map for O(1) lookup
  const priceMap = new Map(
    dbProducts.map((p) => [
      p.id,
      // Use sale price when set, otherwise base price
      Number(p.salePrice ?? p.basePrice)
    ])
  );

  // Reject if any item is not found in this store's catalog
  for (const item of items) {
    if (!priceMap.has(item.productId)) {
      return json(
        { error: `Product not found in this store: ${item.productId}` },
        { status: 422 }
      );
    }
  }

  // Calculate subtotal exclusively from server-sourced prices — never item.price
  const subtotal = items.reduce(
    (sum, item) => sum + (priceMap.get(item.productId) as number) * item.quantity,
    0
  );

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
          dc.type === 'percentage'
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
  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
  const orderId = nanoid();

  // Insert order (items are stored in a separate orderItems table)
  await db.insert(orders).values({
    id: orderId,
    storeId,
    orderNumber,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    subtotal: subtotal.toFixed(2),
    shippingFee: shippingFee.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    discountCodeId: discountCodeId ?? null,
    total: total.toFixed(2),
    notes: notes ?? null,
    status: 'pending'
  });

  // Insert order items — unit price comes from the DB-sourced priceMap
  if (items.length > 0) {
    await db.insert(orderItems).values(
      items.map((item) => {
        const unitPrice = priceMap.get(item.productId) as number;
        return {
          id: nanoid(),
          orderId,
          productId: item.productId,
          productTitle: item.title,
          unitPrice: unitPrice.toFixed(2),
          quantity: item.quantity,
          subtotal: (unitPrice * item.quantity).toFixed(2)
        };
      })
    );
  }

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
      `New order #${orderNumber} from ${customerName} (${customerPhone}). Total: Rs. ${total.toFixed(0)}`
    );
    whatsappUrl = `https://wa.me/${waPhone}?text=${msg}`;
  }

  return json({ orderRef: orderNumber, whatsappUrl });
};
