import { db } from '$lib/server/db';
import { orderItems, products, productVariants } from '$lib/server/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { matchLineVariants } from '$lib/server/cartStock';
import { syncProductStock } from '$lib/server/productStock';

/**
 * Puts an order's items back into stock (used when an order is cancelled).
 * Lines with variants restore each option they drew from; plain products restore their own
 * stock. Products with variants are then re-synced so inventory = combined variant stock.
 */
export async function restoreOrderStock(orderId: string): Promise<void> {
	const items = await db
		.select({
			productId: orderItems.productId,
			variantId: orderItems.variantId,
			variantLabel: orderItems.variantLabel,
			quantity: orderItems.quantity
		})
		.from(orderItems)
		.where(eq(orderItems.orderId, orderId));

	// Lines whose product was deleted point at the hidden default product: nothing to restock
	const lineProductIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => !!id))];
	const defaultRows = lineProductIds.length
		? await db
				.select({ id: products.id })
				.from(products)
				.where(and(inArray(products.id, lineProductIds), eq(products.isDefault, true)))
		: [];
	const defaultProductIds = new Set(defaultRows.map((r) => r.id));

	// Variant rows for lines that recorded which option(s) they used (needed to find every option)
	const labelledProductIds = [
		...new Set(items.filter((i) => i.productId && i.variantLabel).map((i) => i.productId as string))
	];
	const variantRows = labelledProductIds.length
		? await db
				.select({ id: productVariants.id, productId: productVariants.productId, label: productVariants.label })
				.from(productVariants)
				.where(inArray(productVariants.productId, labelledProductIds))
		: [];

	// Lines whose variant was removed point at the hidden default variant: nothing to restock
	const lineVariantIds = [...new Set(items.map((i) => i.variantId).filter((id): id is string => !!id))];
	const defaultVariantRows = lineVariantIds.length
		? await db
				.select({ id: productVariants.id })
				.from(productVariants)
				.where(and(inArray(productVariants.id, lineVariantIds), eq(productVariants.isDefault, true)))
		: [];
	const defaultVariantIds = new Set(defaultVariantRows.map((r) => r.id));

	const touchedVariantProducts = new Set<string>();

	for (const item of items) {
		// Skip rows where the product has since been deleted
		if (!item.productId || defaultProductIds.has(item.productId)) continue;

		await db
			.update(products)
			.set({ stockQty: sql`${products.stockQty} + ${item.quantity}` })
			.where(eq(products.id, item.productId));

		// Every option the line used: those named in its label, plus the recorded variant
		const labelParts = (item.variantLabel ?? '').split(' / ').map((s) => s.trim()).filter(Boolean);
		const fromLabel = matchLineVariants(
			variantRows,
			item.productId,
			Object.fromEntries(labelParts.map((p, i) => [String(i), p]))
		).map((v) => v.id);
		const variantIds = new Set(fromLabel);
		if (item.variantId && !defaultVariantIds.has(item.variantId)) variantIds.add(item.variantId);

		for (const variantId of variantIds) {
			await db
				.update(productVariants)
				.set({ stockQty: sql`${productVariants.stockQty} + ${item.quantity}` })
				.where(eq(productVariants.id, variantId));
			touchedVariantProducts.add(item.productId);
		}
	}

	for (const productId of touchedVariantProducts) {
		try {
			await syncProductStock(productId);
		} catch (err) {
			// Stock was already restored per row; a failed re-sync is corrected on the next sync
			console.error('syncProductStock failed', productId, err);
		}
	}
}
