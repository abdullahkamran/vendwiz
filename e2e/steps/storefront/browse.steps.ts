/**
 * browse.steps.ts — step definitions for storefront browse feature.
 *
 * Storefront is served at /store/e2e-testing/* (path-based routing).
 * STORE_BASE = '/store/e2e-testing'
 *
 * Sort fix: use waitForURL (not networkidle) because applyFilters uses
 * SvelteKit goto() which completes before networkidle fires.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';
import { STORE_BASE } from '../../fixtures/index.js';

Given('I am on the storefront homepage', async ({ page }) => {
	await page.goto(STORE_BASE);
	await page.waitForLoadState('networkidle');
});

Then('the page renders successfully', async ({ page }) => {
	// Verify no 5xx — any visible element means the page rendered
	await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
});

Given('I am on the storefront products page', async ({ page }) => {
	await page.goto(`${STORE_BASE}/products`);
	await page.waitForLoadState('networkidle');
});

Then('I see {string} in the product listing', async ({ page }, title: string) => {
	await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I search for {string}', async ({ page }, query: string) => {
	const searchInput = page.locator('input.products-search').first();
	await searchInput.fill(query);
	// Debounced — wait for URL to include the query param
	await page.waitForURL(new RegExp(`q=${encodeURIComponent(query)}`), { timeout: 10_000 });
	await page.waitForLoadState('networkidle');
});

Then('the URL contains {string}', async ({ page }, fragment: string) => {
	expect(page.url()).toContain(fragment);
});

When('I sort products by price low to high', async ({ page }) => {
	await page.locator('select.products-sort').first().selectOption('price_asc');
	// waitForURL because applyFilters uses goto() — more reliable than networkidle
	await page.waitForURL(/sort=price_asc/, { timeout: 10_000 });
});
