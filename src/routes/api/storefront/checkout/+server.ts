import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, discountCodes, products, productVariants } from '$lib/server/db/schema';
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
  const productIds = items.map((i) => i.productId);
  const dbProducts = await db
    .select({
      id: products.id,
      basePrice: products.basePrice,
      salePrice: products.salePrice,
      stockQty: products.stockQty,
      isPublished: products.isPublished
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, productIds)));

  const priceMap = new Map(
    dbProducts.map((p) => [p.id, Number(p.salePrice ?? p.basePrice)])
  );
  const stockMap = new Map(dbProducts.map((p) => [p.id, p.stockQty]));

  // Reject if any item is not found in this store's catalog
  for (const item of items) {
    if (!priceMap.has(item.productId)) {
      return json(
        { error: `Product not found in this store: ${item.productId}` },
        { status: 422 }
      );
    }
  }

  // ── Variant resolution ────────────────────────────────────────────────────
  type VariantResolution = { id: string; price: number; label: string; stockQty: number };
  const variantResolutionMap = new Map<string, VariantResolution>();
  const productIdsWithVariants = [
    ...new Set(
      items
        .filter((i) => i.variantSelections && Object.keys(i.variantSelections).length > 0)
        .map((i) => i.productId)
    )
  ];

  if (productIdsWithVariants.length > 0) {
    const allVariants = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        price: productVariants.price,
        label: productVariants.label,
        stockQty: productVariants.stockQty
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIdsWithVariants));

    for (const item of items) {
      if (!item.variantSelections || Object.keys(item.variantSelections).length === 0) continue;
      const key = `${item.productId}_${JSON.stringify(item.variantSelections)}`;
      const selectionValues = Object.values(item.variantSelections);
      const match = allVariants
        .filter((v) => v.productId === item.productId)
        .find((v) => {
          const labelParts = v.label.split(' / ').map((s) => s.trim());
          return selectionValues.every((sv) => labelParts.includes(sv.trim()));
        });
      if (match) {
        variantResolutionMap.set(key, {
          id: match.id,
          price: match.price !== null ? Number(match.price) : (priceMap.get(item.productId) as number),
          label: match.label,
          stockQty: match.stockQty
        });
      }
    }
  }

  // Helper: effective price for an item (variant overrides base/sale price)
  function getItemPrice(item: (typeof items)[0]): number {
    if (item.variantSelections && Object.keys(item.variantSelections).length > 0) {
      const key = `${item.productId}_${JSON.stringify(item.variantSelections)}`;
      const v = variantResolutionMap.get(key);
      if (v) return v.price;
    }
    return priceMap.get(item.productId) as number;
  }

  // ── Stock check before order insert ──────────────────────────────────────
  for (const item of items) {
    const hasVariant = item.variantSelections && Object.keys(item.variantSelections).length > 0;
    if (hasVariant) {
      const key = `${item.productId}_${JSON.stringify(item.variantSelections)}`;
      const v = variantResolutionMap.get(key);
      if (v && v.stockQty < item.quantity) {
        return json({ error: `${item.title} is out of stock` }, { status: 400 });
      }
    } else {
      const stock = stockMap.get(item.productId);
      if (stock !== undefined && stock < item.quantity) {
        return json({ error: `${item.title} is out of stock` }, { status: 400 });
      }
    }
  }

  // Calculate subtotal from server-sourced prices — never item.price
  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);

  // Shipping fee
  const shippingFee = freeThreshold !== null && subtotal >= freeThreshold ? 0 : flatRate;

  // Tax
  const taxAmount = subtotal * taxRate;

  // Discount
  let discountAmount = 0;
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
      const withinLimit = dc.usageLimit === null || dc.usageCount < dc.usageLimit;
      const notExpired = !dc.expiresAt || dc.expiresAt > new Date();

      if (withinLimit && notExpired) {
        discountAmount =
          dc.type === 'percentage'
            ? (subtotal * Number(dc.value)) / 100
            : Math.min(Number(dc.value), subtotal);
        discountCodeId = dc.id;
      }
    }
  }

  // Total
  const total = Math.max(0, subtotal + shippingFee + taxAmount - discountAmount);

  // Generate order reference
  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
  const orderId = nanoid();

  // Insert order
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

  // Insert order items — unit price comes from DB-sourced prices; variantId stored
  if (items.length > 0) {
    await db.insert(orderItems).values(
      items.map((item) => {
        const hasVariant = item.variantSelections && Object.keys(item.variantSelections).length > 0;
        const variantKey = hasVariant
          ? `${item.productId}_${JSON.stringify(item.variantSelections)}`
          : null;
        const variant = variantKey ? variantResolutionMap.get(variantKey) : null;
        const unitPrice = variant ? variant.price : (priceMap.get(item.productId) as number);
        return {
          id: nanoid(),
          orderId,
          productId: item.productId,
          variantId: variant?.id ?? null,
          productTitle: item.title,
          variantLabel: variant?.label ?? null,
          unitPrice: unitPrice.toFixed(2),
          quantity: item.quantity,
          subtotal: (unitPrice * item.quantity).toFixed(2)
        };
      })
    );
  }

  // ── Inventory decrement after order insert ────────────────────────────────
  for (const item of items) {
    await db
      .update(products)
      .set({ stockQty: sql`${products.stockQty} - ${item.quantity}` })
      .where(eq(products.id, item.productId));

    const hasVariant = item.variantSelections && Object.keys(item.variantSelections).length > 0;
    if (hasVariant) {
      const key = `${item.productId}_${JSON.stringify(item.variantSelections)}`;
      const v = variantResolutionMap.get(key);
      if (v) {
        await db
          .update(productVariants)
          .set({ stockQty: sql`${productVariants.stockQty} - ${item.quantity}` })
          .where(eq(productVariants.id, v.id));
      }
    }
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
