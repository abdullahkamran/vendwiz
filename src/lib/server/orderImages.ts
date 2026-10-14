import { db } from '$lib/server/db';
import { productOptionGroups, productOptionValues } from '$lib/server/db/schema';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

/** Option values (e.g. colours) that have their own image, for the given products. */
export async function loadOptionImageRows(productIds: string[]) {
	if (productIds.length === 0) return [];
	return db
		.select({
			productId: productOptionGroups.productId,
			label: productOptionValues.label,
			value: productOptionValues.value,
			imageUrl: productOptionValues.imageUrl
		})
		.from(productOptionValues)
		.innerJoin(productOptionGroups, eq(productOptionValues.groupId, productOptionGroups.id))
		.where(and(inArray(productOptionGroups.productId, productIds), isNotNull(productOptionValues.imageUrl)));
}
