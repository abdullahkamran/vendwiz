import { db } from '$lib/server/db';
import { products, productVariants } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type CartLine = {
	productId: string;
	quantity: number;
	variantSelections?: Record<string, string>;
};

export type StockIssue = {
	productId: string;
	variantSelections?: Record<string, string>;
	requested: number;
	available: number;
	message: string;
};

function describe(selections?: Record<string, string>): string {
	const parts = Object.entries(selections ?? {}).map(([k, v]) => `${k}: ${v}`);
	return parts.length ? ` (${parts.join(', ')})` : '';
}

/** The variant (option-stock) rows a cart line draws from: one per selected option, if any. */
export function matchLineVariants<T extends { id: string; productId: string; label: string }>(
	variantRows: T[],
	productId: string,
	selections?: Record<string, string>
): T[] {
	const matched = new Map<string, T>();
	for (const sv of Object.values(selections ?? {}).map((v) => v.trim())) {
		const v = variantRows.find(
			(row) => row.productId === productId && (row.label ?? '').split(' / ').map((s) => s.trim()).includes(sv)
		);
		if (v) matched.set(v.id, v);
	}
	return [...matched.values()];
}

/**
 * Checks every cart line against current stock and returns one issue per line that can't be
 * fulfilled. Stock is shared across lines: two lines drawing on the same option (or the same
 * plain product) are counted together, so the cart as a whole must fit.
 */
export async function findStockIssues(storeId: string, lines: CartLine[]): Promise<StockIssue[]> {
	if (lines.length === 0) return [];

	const productIds = [...new Set(lines.map((l) => l.productId))];
	const [productRows, variantRows] = await Promise.all([
		db
			.select({ id: products.id, title: products.title, stockQty: products.stockQty, isPublished: products.isPublished })
			.from(products)
			.where(and(eq(products.storeId, storeId), inArray(products.id, productIds))),
		db
			.select({ id: productVariants.id, productId: productVariants.productId, label: productVariants.label, stockQty: productVariants.stockQty })
			.from(productVariants)
			.where(inArray(productVariants.productId, productIds))
	]);

	const productMap = new Map(productRows.map((p) => [p.id, p]));

	// Which variant rows each line draws stock from (one per selected option; none → product stock)
	const lineVariants = lines.map((line) => matchLineVariants(variantRows, line.productId, line.variantSelections));

	// Total demand per stock bucket across the whole cart
	const variantDemand = new Map<string, number>();
	const productDemand = new Map<string, number>();
	lines.forEach((line, i) => {
		if (lineVariants[i].length > 0) {
			for (const v of lineVariants[i]) variantDemand.set(v.id, (variantDemand.get(v.id) ?? 0) + line.quantity);
		} else {
			productDemand.set(line.productId, (productDemand.get(line.productId) ?? 0) + line.quantity);
		}
	});

	const issues: StockIssue[] = [];
	lines.forEach((line, i) => {
		const product = productMap.get(line.productId);
		const name = `${product?.title ?? 'This item'}${describe(line.variantSelections)}`;

		if (!product || !product.isPublished) {
			issues.push({ productId: line.productId, variantSelections: line.variantSelections, requested: line.quantity, available: 0, message: `${name} is no longer available` });
			return;
		}

		// What's left for this line once the other lines' demand on the same stock is subtracted
		let available: number;
		if (lineVariants[i].length > 0) {
			available = Math.min(
				...lineVariants[i].map((v) => v.stockQty - ((variantDemand.get(v.id) ?? 0) - line.quantity))
			);
		} else {
			available = product.stockQty - ((productDemand.get(line.productId) ?? 0) - line.quantity);
		}
		available = Math.max(0, available);

		if (line.quantity > available) {
			issues.push({
				productId: line.productId,
				variantSelections: line.variantSelections,
				requested: line.quantity,
				available,
				message:
					available === 0
						? `${name} is out of stock`
						: `* ${name}`
			});
		}
	});

	return issues;
}
