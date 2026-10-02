import { describe, it, expect } from 'vitest';
import {
	absUrl,
	buildSeo,
	websiteJsonLd,
	productJsonLd,
	themeColorFor,
	stripHtml
} from './seo';

// ─── absUrl ───────────────────────────────────────────────────────────────────

describe('absUrl', () => {
	it('prepends origin to a root-relative path', () => {
		expect(absUrl('http://store.localhost:5000', '/products')).toBe(
			'http://store.localhost:5000/products'
		);
	});

	it('adds a leading slash when the path has none', () => {
		expect(absUrl('http://store.localhost:5000', 'products')).toBe(
			'http://store.localhost:5000/products'
		);
	});

	it('passes through an already-absolute URL component correctly', () => {
		expect(absUrl('http://store.localhost:5000', '/')).toBe('http://store.localhost:5000/');
	});
});

// ─── stripHtml ────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
	it('removes HTML tags and collapses whitespace', () => {
		expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('returns plain strings unchanged (modulo whitespace trim)', () => {
		expect(stripHtml('No tags here')).toBe('No tags here');
	});
});

// ─── buildSeo ────────────────────────────────────────────────────────────────

const baseStore = {
	name: 'My Store',
	description: 'Store description',
	seoTitle: null,
	seoDescription: null,
	logoUrl: null,
	faviconUrl: null
};

const baseUrl = new URL('http://mystore.localhost:5000/');

describe('buildSeo', () => {
	it('builds an absolute canonical URL', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore });
		expect(tags.canonical).toBe('http://mystore.localhost:5000/');
	});

	it('falls back to store.description when no description is provided', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore });
		expect(tags.description).toBe('Store description');
	});

	it('prefers provided description over store fallbacks', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore, description: 'Custom desc' });
		expect(tags.description).toBe('Custom desc');
	});

	it('prefers store.seoDescription over store.description', () => {
		const store = { ...baseStore, seoDescription: 'SEO desc' };
		const tags = buildSeo({ url: baseUrl, store });
		expect(tags.description).toBe('SEO desc');
	});

	it('falls back to "Shop at {name}" when no description at all', () => {
		const store = { ...baseStore, description: null };
		const tags = buildSeo({ url: baseUrl, store });
		expect(tags.description).toBe('Shop at My Store');
	});

	it('absolutises a root-relative image path', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore, image: '/uploads/img.jpg' });
		expect(tags.ogImage).toBe('http://mystore.localhost:5000/uploads/img.jpg');
	});

	it('passes through an already-absolute image URL unchanged', () => {
		const img = 'https://cdn.example.com/photo.jpg';
		const tags = buildSeo({ url: baseUrl, store: baseStore, image: img });
		expect(tags.ogImage).toBe(img);
	});

	it('falls back to store.logoUrl for og:image', () => {
		const store = { ...baseStore, logoUrl: 'https://cdn.example.com/logo.png' };
		const tags = buildSeo({ url: baseUrl, store });
		expect(tags.ogImage).toBe('https://cdn.example.com/logo.png');
	});

	it('falls back to store.faviconUrl when no logo', () => {
		const store = { ...baseStore, logoUrl: null, faviconUrl: 'https://cdn.example.com/fav.png' };
		const tags = buildSeo({ url: baseUrl, store });
		expect(tags.ogImage).toBe('https://cdn.example.com/fav.png');
	});

	it('uses the hardcoded /favicon.svg fallback when no logo or favicon', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore });
		expect(tags.ogImage).toBe('http://mystore.localhost:5000/favicon.svg');
	});

	it('sets twitter:card to summary_large_image when requested', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore, card: 'summary_large_image' });
		expect(tags.twitterCard).toBe('summary_large_image');
	});

	it('defaults twitter:card to summary', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore });
		expect(tags.twitterCard).toBe('summary');
	});

	it('sets og:type to the provided value', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore, type: 'product' });
		expect(tags.ogType).toBe('product');
	});

	it('sets og:site_name to store.name', () => {
		const tags = buildSeo({ url: baseUrl, store: baseStore });
		expect(tags.ogSiteName).toBe('My Store');
	});

	it('mirrors canonical as og:url', () => {
		const url = new URL('http://mystore.localhost:5000/products/foo');
		const tags = buildSeo({ url, store: baseStore });
		expect(tags.ogUrl).toBe(tags.canonical);
		expect(tags.ogUrl).toBe('http://mystore.localhost:5000/products/foo');
	});
});

// ─── websiteJsonLd ────────────────────────────────────────────────────────────

describe('websiteJsonLd', () => {
	it('returns valid JSON with @type WebSite', () => {
		const json = JSON.parse(websiteJsonLd('http://mystore.localhost:5000', 'My Store'));
		expect(json['@type']).toBe('WebSite');
	});

	it('includes non-empty name and url', () => {
		const json = JSON.parse(websiteJsonLd('http://mystore.localhost:5000', 'My Store'));
		expect(json.name).toBe('My Store');
		expect(json.url).toBe('http://mystore.localhost:5000');
	});

	it('escapes < to prevent script injection', () => {
		const json = websiteJsonLd('http://x.localhost', '<script>');
		expect(json).not.toContain('<script>');
		expect(json).toContain('\\u003cscript>');
	});
});

// ─── productJsonLd ────────────────────────────────────────────────────────────

describe('productJsonLd', () => {
	const params = {
		origin: 'http://mystore.localhost:5000',
		slug: 'blue-shirt',
		title: 'Blue Shirt',
		description: 'A nice shirt',
		image: 'https://cdn.example.com/shirt.jpg',
		price: 1500,
		currency: 'PKR',
		inStock: true
	};

	it('returns valid JSON with @type Product', () => {
		const json = JSON.parse(productJsonLd(params));
		expect(json['@type']).toBe('Product');
	});

	it('includes name, description, image', () => {
		const json = JSON.parse(productJsonLd(params));
		expect(json.name).toBe('Blue Shirt');
		expect(json.description).toBe('A nice shirt');
		expect(json.image).toBe('https://cdn.example.com/shirt.jpg');
	});

	it('includes offers.price, offers.priceCurrency, offers.availability', () => {
		const json = JSON.parse(productJsonLd(params));
		expect(json.offers.price).toBe('1500');
		expect(json.offers.priceCurrency).toBe('PKR');
		expect(json.offers.availability).toBe('https://schema.org/InStock');
	});

	it('maps inStock=false to OutOfStock', () => {
		const json = JSON.parse(productJsonLd({ ...params, inStock: false }));
		expect(json.offers.availability).toBe('https://schema.org/OutOfStock');
	});

	it('absolutises a root-relative image in the ld+json block', () => {
		const json = JSON.parse(
			productJsonLd({ ...params, image: '/uploads/shirt.jpg' })
		);
		expect(json.image).toBe('http://mystore.localhost:5000/uploads/shirt.jpg');
	});
});

// ─── themeColorFor ────────────────────────────────────────────────────────────

describe('themeColorFor', () => {
	it('returns the correct hex for basic theme', () => {
		expect(themeColorFor({ theme: 'basic' })).toBe('#0d6efd');
	});

	it('returns the correct hex for bold theme', () => {
		expect(themeColorFor({ theme: 'bold' })).toBe('#f97316');
	});

	it('returns custom primaryColor for custom theme when valid', () => {
		expect(themeColorFor({ theme: 'custom', customTheme: { primaryColor: '#aabbcc' } })).toBe(
			'#aabbcc'
		);
	});

	it('falls back to basic hex for custom theme with unsafe primaryColor', () => {
		expect(
			themeColorFor({ theme: 'custom', customTheme: { primaryColor: 'javascript:alert(1)' } })
		).toBe('#0d6efd');
	});

	it('falls back to basic hex for unknown themes', () => {
		expect(themeColorFor({ theme: 'unknown_theme' })).toBe('#0d6efd');
	});
});
