/**
 * Stock rules shared by the admin form, API handlers and storefront.
 *
 * A product with variants has no independent stock of its own: its stock is the combined
 * stock of its variants. Each option value has its own stock row, so with several option
 * groups (e.g. Color and Size) the *first* group is used — summing every group would count
 * the same physical units more than once.
 */

/** Combined stock from an admin form / API payload (variant groups with per-option stock). */
export function sumFirstGroupStock(
	variants: Array<{ options: Array<{ stockQty?: number | null }> }>
): number | null {
	const first = variants.find((v) => v.options.length > 0);
	if (!first) return null;
	return first.options.reduce((sum, o) => sum + Math.max(0, o.stockQty ?? 0), 0);
}

/**
 * Combined stock from stored data: option groups (with their values) and variant rows.
 * Returns null when the product has no variants (use the product's own stock then).
 */
export function combinedStockFromData(
	optionGroups: Array<{ id: string; sortOrder?: number; values: Array<{ id: string }> }>,
	variants: Array<{ optionValueIds: unknown; stockQty: number }>
): number | null {
	if (variants.length === 0) return null;
	if (optionGroups.length === 0) {
		// Legacy products: flat variant rows without option groups
		return variants.reduce((sum, v) => sum + Math.max(0, v.stockQty), 0);
	}
	const first = [...optionGroups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
	const ids = new Set(first.values.map((v) => v.id));
	return variants
		.filter((v) => Array.isArray(v.optionValueIds) && (v.optionValueIds as string[]).some((id) => ids.has(id)))
		.reduce((sum, v) => sum + Math.max(0, v.stockQty), 0);
}
