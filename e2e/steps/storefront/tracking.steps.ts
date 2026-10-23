/**
 * tracking.steps.ts — step definitions for storefront order tracking feature.
 *
 * AC29: the tracking scenario places its own order through the storefront
 * checkout API in page context and stores the ref in a module-level variable.
 * This avoids cross-scenario state and is deterministic under retries.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';
import { STORE_BASE } from '../../fixtures/index.js';

// Scenario-scoped order reference set by "I have placed a test order"
let _testOrderRef: string | null = null;

Given('I am on the storefront track page', async ({ page }) => {
	await page.goto(`${STORE_BASE}/track`);
	await page.waitForLoadState('networkidle');
});

Then('I see an order reference input field', async ({ page }) => {
	await expect(page.getByPlaceholder('e.g. ORD-ABC12345')).toBeVisible({ timeout: 10_000 });
});

Given('I have placed a test order and have its reference', async ({ page }) => {
	// Add E2E Product to cart via PDP
	await page.goto(`${STORE_BASE}/products/e2e-product`);
	await page.waitForLoadState('networkidle');
	await page.locator('button.pdp-btn-atc').click();
	await page.waitForTimeout(300);

	// Go to checkout and submit
	await page.goto(`${STORE_BASE}/checkout`);
	await page.waitForLoadState('networkidle');
	await page.locator('#co-name').fill('Tracking Buyer');
	await page.locator('#co-phone').fill('3001234567');
	await page.locator('#co-email').fill('tracking@e2e-testing.local');
	await page.locator('#co-address').fill('456 Track Avenue, Karachi');
	await page.locator('button[type="submit"]').first().click();
	await page.waitForURL(new RegExp(`${STORE_BASE}/checkout/confirmation`), { timeout: 30_000 });

	const url = new URL(page.url());
	_testOrderRef = url.searchParams.get('ref');
	if (!_testOrderRef) throw new Error('No order ref returned from checkout');
});

When('I submit the test order reference', async ({ page }) => {
	if (!_testOrderRef) throw new Error('No test order ref — run the Given step first');
	await page.getByPlaceholder('e.g. ORD-ABC12345').fill(_testOrderRef);
	await page.getByRole('button', { name: /track order/i }).click();
});

Then('I see the order status on the page', async ({ page }) => {
	// The track page shows order status details when a ref is found
	await expect(
		page.locator('[data-testid="order-status"], .track-status, .track-confirmed, .track-wrap').first()
	).toBeVisible({ timeout: 10_000 });
});

When('I submit an unknown order reference', async ({ page }) => {
	await page.getByPlaceholder('e.g. ORD-ABC12345').fill('UNKNOWN-REF-9999');
	await page.getByRole('button', { name: /track order/i }).click();
});

Then('I see an order not found message', async ({ page }) => {
	await expect(page.getByText('Order not found', { exact: false })).toBeVisible({ timeout: 10_000 });
});
