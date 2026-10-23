/**
 * Client-side validation for the product form. Mirrors the server schema
 * (lib/schemas/catalog.ts) so people see which field to fix instead of a raw
 * validation error from the API.
 */
import { parseVideoSource } from '$lib/utils/video';

export type ProductTab = 'basic' | 'images' | 'variants' | 'attributes' | 'inventory' | 'seo' | 'reels';

export type ProductFormInput = {
	title: string;
	slug: string;
	basePrice: number | null | undefined;
	salePrice?: number | null | undefined;
	stockQty: number | null | undefined;
	lowStockThreshold: number | null | undefined;
	seoTitle: string;
	seoDescription: string;
	variants: Array<{ name: string; sizeChartUrl?: string }>;
	attributes: Array<{ name: string; value: string }>;
	reels?: Array<{ videoUrl: string }>;
};

const SLUG_RE = /^[a-z0-9-]+$/;
const isBlank = (v: string | undefined | null) => !v || !v.trim();
const isBadNumber = (n: number | null | undefined, min = 0) =>
	n === null || n === undefined || Number.isNaN(n) || n < min;

export function isValidSizeChartUrl(url: string | undefined): boolean {
	if (isBlank(url)) return true;
	try {
		return new URL(url!.trim()).protocol === 'https:';
	} catch {
		return false;
	}
}

export function validateProductForm(input: ProductFormInput) {
	const fields: Partial<Record<'title' | 'slug' | 'basePrice' | 'salePrice' | 'stockQty' | 'lowStockThreshold' | 'seoTitle' | 'seoDescription', string>> = {};

	if (isBlank(input.title)) fields.title = 'Title is required';
	if (isBlank(input.slug)) fields.slug = 'Slug is required';
	else if (!SLUG_RE.test(input.slug)) fields.slug = 'Use lowercase letters, numbers and hyphens only';
	if (isBadNumber(input.basePrice)) fields.basePrice = 'Enter a valid price (0 or more)';
	if (input.salePrice !== null && input.salePrice !== undefined) {
		if (Number.isNaN(input.salePrice) || input.salePrice < 0) fields.salePrice = 'Enter a valid sale price (0 or more)';
		else if (!fields.basePrice && input.salePrice >= (input.basePrice as number)) fields.salePrice = 'Sale price must be lower than the regular price';
	}
	if (isBadNumber(input.stockQty)) fields.stockQty = 'Enter a valid quantity (0 or more)';
	if (isBadNumber(input.lowStockThreshold)) fields.lowStockThreshold = 'Enter a valid number (0 or more)';
	if (input.seoTitle.length > 60) fields.seoTitle = 'Meta title must be 60 characters or fewer';
	if (input.seoDescription.length > 160) fields.seoDescription = 'Meta description must be 160 characters or fewer';

	const variantsInvalid = input.variants.some((v) => isBlank(v.name) || !isValidSizeChartUrl(v.sizeChartUrl));
	const attributesInvalid = input.attributes.some((a) => isBlank(a.name) || isBlank(a.value));
	const reelsInvalid = (input.reels ?? []).some((r) => !parseVideoSource(r.videoUrl));

	const tabs = new Set<ProductTab>();
	if (fields.title || fields.slug || fields.basePrice || fields.salePrice) tabs.add('basic');
	if (variantsInvalid) tabs.add('variants');
	if (attributesInvalid) tabs.add('attributes');
	if (reelsInvalid) tabs.add('reels');
	if (fields.stockQty || fields.lowStockThreshold) tabs.add('inventory');
	if (fields.seoTitle || fields.seoDescription) tabs.add('seo');

	return { fields, tabs, valid: tabs.size === 0 };
}

/** Tabs in display order, used to jump to the first one with a problem. */
export const TAB_ORDER: ProductTab[] = ['basic', 'images', 'variants', 'attributes', 'inventory', 'seo', 'reels'];
