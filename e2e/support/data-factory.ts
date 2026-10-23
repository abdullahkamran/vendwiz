/**
 * data-factory.ts — builder functions for generating test data payloads.
 *
 * Each function returns a plain object suitable for direct DB insertion or
 * API submission. Callers supply `storeId` and any required FK references.
 */

export interface ProductSeed {
	title: string;
	slug: string;
	basePrice: string;
	stockQty: number;
	isPublished: boolean;
}

export interface CategorySeed {
	name: string;
	slug: string;
	sortOrder: number;
}

export interface DiscountSeed {
	code: string;
	type: 'percentage' | 'fixed';
	value: string;
	isActive: boolean;
}

let _seq = 0;
function seq(): number {
	return ++_seq;
}

/** Creates a product seed payload with a unique title and slug. */
export function makeProduct(overrides: Partial<ProductSeed> = {}): ProductSeed {
	const n = seq();
	const ts = Date.now();
	return {
		title: `E2E Fixture Product ${n}-${ts}`,
		slug: `e2e-fixture-product-${n}-${ts}`,
		basePrice: '50.00',
		stockQty: 10,
		isPublished: true,
		...overrides
	};
}

/** Creates a category seed payload with a unique name and slug. */
export function makeCategory(overrides: Partial<CategorySeed> = {}): CategorySeed {
	const n = seq();
	const ts = Date.now();
	return {
		name: `E2E Fixture Category ${n}-${ts}`,
		slug: `e2e-fixture-cat-${n}-${ts}`,
		sortOrder: 99,
		...overrides
	};
}

/** Creates a discount seed payload with a unique code. */
export function makeDiscount(overrides: Partial<DiscountSeed> = {}): DiscountSeed {
	const n = seq();
	return {
		code: `E2EFIXTURE${n}`,
		type: 'percentage',
		value: '5.00',
		isActive: true,
		...overrides
	};
}
