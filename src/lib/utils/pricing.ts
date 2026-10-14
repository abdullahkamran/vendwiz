/**
 * Sale pricing, shared by the storefront and checkout.
 *
 * A product's sale price replaces its base price. A variant priced "base + modifier" keeps its
 * modifier, so the amount taken off the base price is taken off the variant too.
 */

/** Amount a sale takes off the base price; 0 when there is no (valid) sale. */
export function saleDiscount(
	basePrice: number | string | null | undefined,
	salePrice: number | string | null | undefined
): number {
	if (salePrice === null || salePrice === undefined || salePrice === '') return 0;
	const base = Number(basePrice);
	const sale = Number(salePrice);
	if (!Number.isFinite(base) || !Number.isFinite(sale) || sale >= base) return 0;
	return base - sale;
}

/** A price with the sale discount applied (never below zero). */
export function applySale(price: number, discount: number): number {
	return Math.max(0, price - discount);
}
