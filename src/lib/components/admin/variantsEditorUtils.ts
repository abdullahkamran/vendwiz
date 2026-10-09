/**
 * Pure helper functions for VariantsEditor.svelte.
 *
 * Extracted into a separate module so they can be unit-tested without
 * mounting the Svelte component.
 */

export type VariantOption = {
	label: string;
	price_modifier: number;
	stockQty?: number;
	colorHex?: string;
};

export type VariantRow = {
	id?: string;
	name: string;
	options: VariantOption[];
	sizeChartUrl?: string;
};

/**
 * Append a blank option to variant at index `vi`.
 * The new option is initialised with `stockQty: 0` so that the stock
 * input in the editor always has a defined starting value.
 */
export function addOption(rows: VariantRow[], vi: number): VariantRow[] {
	return rows.map((r, i) =>
		i === vi ? { ...r, options: [...r.options, { label: '', price_modifier: 0, stockQty: 0 }] } : r
	);
}

/**
 * Update the stockQty of option `oi` inside variant `vi`.
 * The value is parsed as an integer and clamped to ≥ 0;
 * any non-numeric input (including empty string) resolves to 0.
 */
export function updateOptionStock(rows: VariantRow[], vi: number, oi: number, str: string): VariantRow[] {
	const stockQty = Math.max(0, parseInt(str, 10) || 0);
	return rows.map((r, i) =>
		i === vi
			? { ...r, options: r.options.map((o, j) => (j === oi ? { ...o, stockQty } : o)) }
			: r
	);
}
