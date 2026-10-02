/**
 * SEO utility functions for the storefront.
 *
 * Provides canonical / OG / Twitter tag helpers, JSON-LD serialisers, and
 * a theme-color resolver — all in one place so per-page head tags stay DRY.
 */

import { THEME_HEX } from './theme/tokens';

// ─── URL helpers ─────────────────────────────────────────────────────────────

/** Build an absolute URL from an origin + a path. */
export function absUrl(origin: string, path: string): string {
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${origin}${p}`;
}

/** Strip HTML tags from a string for use in meta description content. */
export function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── buildSeo ────────────────────────────────────────────────────────────────

export interface SeoProps {
	url: URL;
	store: {
		name: string;
		description?: string | null;
		seoTitle?: string | null;
		seoDescription?: string | null;
		logoUrl?: string | null;
		faviconUrl?: string | null;
	};
	/** Overrides store.seoTitle / store.name for og:title and twitter:title. */
	title?: string | null;
	/** Overrides store.seoDescription / store.description for all description tags. */
	description?: string | null;
	/** Product or page image URL (absolute or root-relative). Falls back to store logo/favicon. */
	image?: string | null;
	/** og:type value. Defaults to 'website'. */
	type?: string;
	/** Twitter card type. Defaults to 'summary'. */
	card?: 'summary' | 'summary_large_image';
}

export interface SeoTags {
	canonical: string;
	description: string;
	ogTitle: string;
	ogDescription: string;
	ogUrl: string;
	ogType: string;
	ogSiteName: string;
	ogImage: string;
	twitterCard: 'summary' | 'summary_large_image';
	twitterTitle: string;
	twitterDescription: string;
}

/**
 * Build a flat SEO tag object from page-level props + store fallbacks.
 * All URL values are guaranteed to be absolute.
 */
export function buildSeo({
	url,
	store,
	title,
	description,
	image,
	type = 'website',
	card = 'summary'
}: SeoProps): SeoTags {
	const origin = url.origin;
	const path = url.pathname;

	const resolvedTitle = title || store.seoTitle || store.name;

	const resolvedDesc =
		description || store.seoDescription || store.description || `Shop at ${store.name}`;

	// Image: passed value → store logo → store favicon → hard-coded fallback
	const rawImage = image || store.logoUrl || store.faviconUrl || '/favicon.svg';
	const ogImage = rawImage.startsWith('http') ? rawImage : absUrl(origin, rawImage);

	return {
		canonical: absUrl(origin, path),
		description: resolvedDesc,
		ogTitle: resolvedTitle,
		ogDescription: resolvedDesc,
		ogUrl: absUrl(origin, path),
		ogType: type,
		ogSiteName: store.name,
		ogImage,
		twitterCard: card,
		twitterTitle: resolvedTitle,
		twitterDescription: resolvedDesc
	};
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────

/**
 * Escape < to < so the JSON string can be safely embedded inside a
 * <script> tag without triggering an HTML parser's </script> recognition.
 */
function safeJson(obj: unknown): string {
	return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/** Build a JSON-LD WebSite block for the home page. */
export function websiteJsonLd(origin: string, name: string): string {
	return safeJson({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name,
		url: origin
	});
}

export interface ProductJsonLdParams {
	origin: string;
	slug: string;
	title: string;
	description: string;
	image: string;
	price: number;
	currency: string;
	inStock: boolean;
}

/** Build a JSON-LD Product block for the product detail page. */
export function productJsonLd({
	origin,
	slug,
	title,
	description,
	image,
	price,
	currency,
	inStock
}: ProductJsonLdParams): string {
	return safeJson({
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: title,
		description,
		image: image.startsWith('http') ? image : absUrl(origin, image),
		url: absUrl(origin, `/products/${slug}`),
		offers: {
			'@type': 'Offer',
			price: price.toString(),
			priceCurrency: currency,
			availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
		}
	});
}

// ─── Theme color ─────────────────────────────────────────────────────────────

/**
 * Return the primary-color hex string for <meta name="theme-color">.
 * For the 'custom' theme, reads customTheme.primaryColor when it passes
 * the CSS-color safety guard; otherwise falls back to the theme-HEX map.
 */
export function themeColorFor(store: { theme: string; customTheme?: unknown }): string {
	if (store.theme === 'custom' && store.customTheme && typeof store.customTheme === 'object') {
		const ct = store.customTheme as Record<string, string>;
		if (ct.primaryColor && isSafeCSSColor(ct.primaryColor)) {
			return ct.primaryColor;
		}
	}
	return THEME_HEX[store.theme] ?? THEME_HEX.basic;
}

/**
 * Strict allow-list guard for CSS color values (mirrors the one in +layout.svelte).
 * Accepted: #rgb / #rrggbb / #rgba / #rrggbbaa, rgb() / rgba(),
 *           hsl() / hsla(), or a plain alphabetic named color (e.g. "red").
 */
function isSafeCSSColor(value: string): boolean {
	if (!value || typeof value !== 'string') return false;
	return (
		/^#[0-9a-fA-F]{3,8}$/.test(value) ||
		/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
			value
		) ||
		/^hsla?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?%\s*,\s*\d+(?:\.\d+)?%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
			value
		) ||
		/^[a-zA-Z]{2,30}$/.test(value)
	);
}
