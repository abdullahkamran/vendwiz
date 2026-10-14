import { db } from '$lib/server/db';
import { categories, products, discountCodes, productVariants, orderItems } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Hidden "default" records, one of each per store. When a category, product or discount code is
 * deleted, whatever pointed at it (products, past order lines, past orders) is re-pointed at the
 * store's default instead, so history keeps a valid reference.
 *
 * They are created on first use and flagged isDefault. They never appear to customers
 * (the default product is unpublished, the default code is inactive, the default category is
 * left out of every storefront query) and are left out of the admin lists too.
 * Their slug / code use characters the admin forms don't allow, so they can't clash with
 * anything an owner creates.
 */
export const DEFAULT_CATEGORY_NAME = 'Uncategorized';
export const DEFAULT_PRODUCT_TITLE = 'Deleted product';
export const DEFAULT_DISCOUNT_CODE = '__DELETED__';
export const DEFAULT_VARIANT_LABEL = 'Deleted variant';
const DEFAULT_SLUG = '__default__';

/** Either the db itself or a transaction handle */
type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>;

export async function getDefaultCategory(storeId: string, tx: Executor = db) {
	const [existing] = await tx
		.select()
		.from(categories)
		.where(and(eq(categories.storeId, storeId), eq(categories.isDefault, true)))
		.limit(1);
	if (existing) return existing;

	const [created] = await tx
		.insert(categories)
		.values({ id: nanoid(), storeId, name: DEFAULT_CATEGORY_NAME, slug: DEFAULT_SLUG, sortOrder: 9999, isDefault: true })
		.returning();
	return created;
}

export async function getDefaultProduct(storeId: string, tx: Executor = db) {
	const [existing] = await tx
		.select()
		.from(products)
		.where(and(eq(products.storeId, storeId), eq(products.isDefault, true)))
		.limit(1);
	if (existing) return existing;

	const [created] = await tx
		.insert(products)
		.values({
			id: nanoid(),
			storeId,
			title: DEFAULT_PRODUCT_TITLE,
			slug: DEFAULT_SLUG,
			basePrice: '0',
			isPublished: false, // never visible to customers
			isDefault: true
		})
		.returning();
	return created;
}

/** The default variant lives on the store's default product, so it is never shown anywhere. */
export async function getDefaultVariant(storeId: string, tx: Executor = db) {
	const product = await getDefaultProduct(storeId, tx);
	const [existing] = await tx
		.select()
		.from(productVariants)
		.where(and(eq(productVariants.productId, product.id), eq(productVariants.isDefault, true)))
		.limit(1);
	if (existing) return existing;

	const [created] = await tx
		.insert(productVariants)
		.values({
			id: nanoid(),
			productId: product.id,
			optionValueIds: [],
			label: DEFAULT_VARIANT_LABEL,
			stockQty: 0,
			isDefault: true
		})
		.returning();
	return created;
}

/**
 * Call before a product's variants are removed (the product is deleted, or saved — saving
 * rebuilds all its variants): any past order line that used one of them is re-pointed at the
 * default variant. The line keeps its saved variant label, price and image.
 */
export async function repointOrderLinesToDefaultVariant(storeId: string, productId: string, tx: Executor = db) {
	const variantIdsOfProduct = tx
		.select({ id: productVariants.id })
		.from(productVariants)
		.where(and(eq(productVariants.productId, productId), eq(productVariants.isDefault, false)));

	const [referenced] = await tx
		.select({ id: orderItems.id })
		.from(orderItems)
		.where(inArray(orderItems.variantId, variantIdsOfProduct))
		.limit(1);
	if (!referenced) return; // no past order used a variant of this product — nothing to move

	const fallback = await getDefaultVariant(storeId, tx);
	await tx
		.update(orderItems)
		.set({ variantId: fallback.id })
		.where(inArray(orderItems.variantId, variantIdsOfProduct));
}

export async function getDefaultDiscount(storeId: string, tx: Executor = db) {
	const [existing] = await tx
		.select()
		.from(discountCodes)
		.where(and(eq(discountCodes.storeId, storeId), eq(discountCodes.isDefault, true)))
		.limit(1);
	if (existing) return existing;

	const [created] = await tx
		.insert(discountCodes)
		.values({
			id: nanoid(),
			storeId,
			code: DEFAULT_DISCOUNT_CODE,
			type: 'fixed',
			value: '0',
			isActive: false, // can never be applied by a customer
			isDefault: true
		})
		.returning();
	return created;
}
