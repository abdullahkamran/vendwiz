/**
 * Tests for the robots.txt route handler (+server.ts).
 *
 * The handler was changed to add `Disallow` directives for private pages
 * (cart, checkout, checkout/confirmation). These tests verify that behaviour
 * and would fail against the pre-change version that only had `Allow: /`.
 */
import { describe, it, expect } from 'vitest';
import { GET } from './+server';

function makeRequest(host = 'mystore.example.com') {
	const url = new URL(`https://${host}/robots.txt`);
	// Only the url property is used by the handler; cast the rest away.
	return GET({ url } as Parameters<typeof GET>[0]);
}

describe('GET /robots.txt', () => {
	it('returns a plain-text response', async () => {
		const res = await makeRequest();
		expect(res.headers.get('Content-Type')).toBe('text/plain');
	});

	it('allows all crawlers at root', async () => {
		const res = await makeRequest();
		const body = await res.text();
		expect(body).toContain('User-agent: *');
		expect(body).toContain('Allow: /');
	});

	it('disallows /cart (added to protect private pages)', async () => {
		const res = await makeRequest();
		const body = await res.text();
		expect(body).toContain('Disallow: /cart');
	});

	it('disallows /checkout (added to protect private pages)', async () => {
		const res = await makeRequest();
		const body = await res.text();
		expect(body).toContain('Disallow: /checkout');
	});

	it('disallows /checkout/confirmation (added to protect private pages)', async () => {
		const res = await makeRequest();
		const body = await res.text();
		expect(body).toContain('Disallow: /checkout/confirmation');
	});

	it('includes the sitemap URL pointing to the correct host', async () => {
		const res = await makeRequest('shop.example.com');
		const body = await res.text();
		expect(body).toContain('Sitemap: https://shop.example.com/sitemap.xml');
	});
});
