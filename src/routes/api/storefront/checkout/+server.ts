import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, discountCodes, products, productVariants } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { checkoutSchema } from '$lib/schemas/storefront';
import { sendEmail } from '$lib/server/email';
import { matchLineVariants } from '$lib/server/cartStock';
import { saleDiscount, applySale } from '$lib/utils/pricing';
import { pickItemImage } from '$lib/utils/orderItemImage';
import { hasBankDetails } from '$lib/paymentInfo';
import { loadOptionImageRows } from '$lib/server/orderImages';
import { syncProductStock } from '$lib/server/productStock';

/** Escape a string for safe interpolation into an HTML body. */
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  const { customerName, customerPhone, customerEmail, shippingAddress, notes, discountCode, items, paymentMethod } =
    parsed.data;

  if (paymentMethod === 'bank_transfer' && !hasBankDetails(locals.store)) {
    return json({ error: 'Bank transfer is not available for this store. Please choose cash on delivery.' }, { status: 422 });
  }

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
      isPublished: products.isPublished,
      images: products.images
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, productIds)));

  const priceMap = new Map(
    dbProducts.map((p) => [p.id, Number(p.basePrice) - saleDiscount(p.basePrice, p.salePrice)])
  );
  const stockMap = new Map(dbProducts.map((p) => [p.id, p.stockQty]));
  // Amount a sale takes off each product; variants keep their modifier, so it applies to them too
  const discountMap = new Map(dbProducts.map((p) => [p.id, saleDiscount(p.basePrice, p.salePrice)]));

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
          price:
            match.price !== null
              ? applySale(Number(match.price), discountMap.get(item.productId) ?? 0)
              : (priceMap.get(item.productId) as number),
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

  // Discount (computed before tax so tax applies to the post-discount subtotal)
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

  // Tax — applied to the post-discount subtotal
  const taxAmount = (subtotal - discountAmount) * taxRate;

  // Total
  const total = Math.max(0, (subtotal - discountAmount) + taxAmount + shippingFee);

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
    paymentMethod,
    customerEmail: customerEmail || null,
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

  // Images are saved on the order lines (taken from our own catalogue, never from the client) so
  // past orders keep them after a product is deleted. Best effort: never blocks the order.
  let optionImageRows: Awaited<ReturnType<typeof loadOptionImageRows>> = [];
  try {
    optionImageRows = await loadOptionImageRows([...new Set(productIds)]);
  } catch (err) {
    console.error('loadOptionImageRows failed', err);
  }

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
        const variantLabel =
          variant?.label ??
          (hasVariant ? Object.values(item.variantSelections as Record<string, string>).join(' / ') : null);
        return {
          id: nanoid(),
          orderId,
          productId: item.productId,
          variantId: variant?.id ?? null,
          productTitle: item.title,
          variantLabel,
          imageUrl: pickItemImage({ productId: item.productId, variantLabel }, dbProducts, optionImageRows),
          unitPrice: unitPrice.toFixed(2),
          quantity: item.quantity,
          subtotal: (unitPrice * item.quantity).toFixed(2)
        };
      })
    );
  }

  // ── Confirmation email (fire-and-forget; failure must never fail the order) ─
  if (customerEmail) {
    const storeName = locals.store.name ?? 'Store';
    const itemSummary = items
      .map((i) => `<li>${htmlEscape(i.title)} × ${i.quantity}</li>`)
      .join('');
    sendEmail({
      to: customerEmail,
      subject: `Order confirmed – #${orderNumber}`,
      html: `<p>Hi ${htmlEscape(customerName)},</p>
<p>Thank you for your order at <strong>${htmlEscape(storeName)}</strong>.</p>
<p>Order number: <strong>#${orderNumber}</strong></p>
<ul>${itemSummary}</ul>
<p>Total: ${locals.store.currencySymbol ?? ''} ${total.toFixed(2)}</p>
<p>Payment: ${paymentMethod === 'bank_transfer' ? 'Bank transfer — please send your payment screenshot to our WhatsApp so we can confirm it.' : 'Cash on delivery'}</p>`
    }).catch(() => {
      // intentionally swallowed — email is best-effort
    });
  }

  // ── Inventory decrement after order insert ────────────────────────────────
  // Stock never drops below zero. Lines with variants draw down each selected option's own
  // stock; the product's inventory figure is then re-synced to the combined variant stock.
  const hasSelections = (i: (typeof items)[number]) =>
    !!i.variantSelections && Object.keys(i.variantSelections).length > 0;
  const variantProductIds = [...new Set(items.filter(hasSelections).map((i) => i.productId))];
  const decrementRows = variantProductIds.length
    ? await db
        .select({ id: productVariants.id, productId: productVariants.productId, label: productVariants.label })
        .from(productVariants)
        .where(inArray(productVariants.productId, variantProductIds))
    : [];

  for (const item of items) {
    const matched = hasSelections(item)
      ? matchLineVariants(decrementRows, item.productId, item.variantSelections)
      : [];
    if (matched.length > 0) {
      for (const v of matched) {
        await db
          .update(productVariants)
          .set({ stockQty: sql`GREATEST(${productVariants.stockQty} - ${item.quantity}, 0)` })
          .where(eq(productVariants.id, v.id));
      }
    } else {
      await db
        .update(products)
        .set({ stockQty: sql`GREATEST(${products.stockQty} - ${item.quantity}, 0)` })
        .where(eq(products.id, item.productId));
    }
  }

  for (const productId of variantProductIds) {
    try {
      await syncProductStock(productId);
    } catch (err) {
      // The order is already placed — a failed re-sync must not fail it; the next product
      // save or order re-syncs.
      console.error('syncProductStock failed', productId, err);
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
      `New order #${orderNumber} from ${customerName} (${customerPhone}). Total: ${locals.store.currencySymbol} ${total.toFixed(0)}`
    );
    whatsappUrl = `https://wa.me/${waPhone}?text=${msg}`;
  }

  return json({ orderRef: orderNumber, whatsappUrl });
};
