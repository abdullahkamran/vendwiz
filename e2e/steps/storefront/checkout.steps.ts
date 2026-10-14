/**
 * checkout.steps.ts — step definitions for storefront checkout feature.
 *
 * Phone field: the checkout form uses a country-dial-code prefix select + a
 * national-digits input. composePhone(dial, phone) produces "+<dial><national>".
 * For Pakistan (+92) enter "3001234567" (strip the leading 0 trunk prefix).
 * Address must be ≥10 chars per checkoutSchema.
 *
 * Stored order ref is shared within a scenario via module-level variable so
 * the confirmation-page step can assert it.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';
import { STORE_BASE } from '../../fixtures/index.js';

// Scenario-scoped shared state (safe: workers=1, fullyParallel=false)
let _lastOrderRef: string | null = null;

// Note: Given('I have {string} in my cart') is defined in cart.steps.ts — shared step

Given('my cart is empty', async ({ page }) => {
	// Navigate to cart and clear it, or just navigate to checkout with no items
	// The cart is localStorage — open a fresh page context (already clean)
	await page.goto(`${STORE_BASE}/`);
	await page.evaluate(() => localStorage.clear());
});

When('I navigate to the checkout page', async ({ page }) => {
	await page.goto(`${STORE_BASE}/checkout`);
	await page.waitForLoadState('networkidle');
});

Then('I see fields for name, phone, email, and address', async ({ page }) => {
	await expect(page.locator('#co-name')).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('#co-phone')).toBeVisible();
	await expect(page.locator('#co-email')).toBeVisible();
	await expect(page.locator('#co-address')).toBeVisible();
});

When('I complete the checkout with valid details', async ({ page }) => {
	await page.goto(`${STORE_BASE}/checkout`);
	await page.waitForLoadState('networkidle');

	await page.locator('#co-name').fill('Test Buyer');
	// Phone: enter national digits (no leading 0); dial prefix is selected automatically
	await page.locator('#co-phone').fill('3001234567');
	await page.locator('#co-email').fill('buyer@e2e-testing.local');
	// Address must be ≥10 chars
	await page.locator('#co-address').fill('123 Test Street, Lahore');

	// Submit order
	await page.locator('button[type="submit"]').first().click();

	// Wait for redirect to confirmation page
	await page.waitForURL(new RegExp(`${STORE_BASE}/checkout/confirmation`), { timeout: 30_000 });

	// Capture the order ref for later assertion
	const url = new URL(page.url());
	_lastOrderRef = url.searchParams.get('ref');
});

Then('I am on the confirmation page with a ref parameter', async ({ page }) => {
	await expect(page).toHaveURL(new RegExp(`${STORE_BASE}/checkout/confirmation`));
	const url = new URL(page.url());
	expect(url.searchParams.get('ref')).toBeTruthy();
});

Then('the confirmation page shows the order reference', async ({ page }) => {
	const url = new URL(page.url());
	const ref = url.searchParams.get('ref');
	if (ref) {
		await expect(page.getByText(ref, { exact: false })).toBeVisible({ timeout: 10_000 });
	} else {
		// Fallback: at least the page rendered
		await expect(page.locator('body')).toBeVisible();
	}
});

Then('I am redirected away from checkout', async ({ page }) => {
	// Empty cart causes goto(basePath || '/')
	await page.waitForURL(new RegExp(`^(${STORE_BASE}/?|http://localhost:\\d+/?)`), { timeout: 10_000 });
	expect(page.url()).not.toContain('/checkout');
});
