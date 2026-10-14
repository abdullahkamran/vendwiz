type ProductImage = { url: string; order?: number };

/**
 * Picks the image to show for an order line: the image of a chosen option (e.g. the colour
 * the customer picked, found via the line's variant label such as "Red / Small") when it has
 * one, otherwise the product's first image. Null when neither exists (e.g. product deleted).
 */
export function pickItemImage(
	item: { productId: string | null; variantLabel: string | null },
	productRows: Array<{ id: string; images: unknown }>,
	optionImageRows: Array<{ productId: string; label: string | null; value: string; imageUrl: string | null }>
): string | null {
	if (!item.productId) return null;

	const parts = (item.variantLabel ?? '').split(' / ').map((s) => s.trim()).filter(Boolean);
	if (parts.length > 0) {
		const option = optionImageRows.find(
			(o) =>
				o.productId === item.productId &&
				o.imageUrl &&
				((o.label && parts.includes(o.label.trim())) || parts.includes(o.value.trim()))
		);
		if (option?.imageUrl) return option.imageUrl;
	}

	const product = productRows.find((p) => p.id === item.productId);
	const images = Array.isArray(product?.images) ? (product!.images as ProductImage[]) : [];
	const first = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
	return first?.url ?? null;
}
