import { db } from '$lib/server/db';
import { products, productVariants, productOptionGroups, productOptionValues } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { combinedStockFromData } from '$lib/utils/stock';

/**
 * Recomputes products.stockQty for a product that has variants, so the inventory figure
 * always equals the combined stock of its variants. No-op for products without variants.
 */
export async function syncProductStock(productId: string): Promise<void> {
	const [groups, variants] = await Promise.all([
		db.select().from(productOptionGroups).where(eq(productOptionGroups.productId, productId)).orderBy(asc(productOptionGroups.sortOrder)),
		db.select().from(productVariants).where(eq(productVariants.productId, productId))
	]);

	const firstGroup = groups[0];
	const values = firstGroup
		? await db.select().from(productOptionValues).where(eq(productOptionValues.groupId, firstGroup.id))
		: [];

	const combined = combinedStockFromData(
		firstGroup ? [{ id: firstGroup.id, sortOrder: firstGroup.sortOrder, values }] : [],
		variants
	);
	if (combined === null) return;

	await db.update(products).set({ stockQty: combined }).where(eq(products.id, productId));
}
