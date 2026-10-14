/**
 * pdp.steps.ts — step definitions for storefront product detail page.
 *
 * PDP fix: use getByRole('heading', { level: 1 }) to avoid strict-mode
 * violations from multiple elements matching getByText('E2E Product').
 * The h1.pdp-title is the unique heading on the page.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';
import { STORE_BASE } from '../../fixtures/index.js';

const E2E_PRODUCT_SLUG = 'e2e-product';

Given('I am on the E2E Product detail page', async ({ page }) => {
	await page.goto(`${STORE_BASE}/products/${E2E_PRODUCT_SLUG}`);
	await page.waitForLoadState('networkidle');
});

Then('the page heading contains {string}', async ({ page }, title: string) => {
	// Use getByRole to uniquely target the h1 element (avoids strict mode violations)
	await expect(page.getByRole('heading', { level: 1 })).toContainText(title, { timeout: 10_000 });
});

Then('I see an add-to-cart button', async ({ page }) => {
	await expect(page.locator('button.pdp-btn-atc')).toBeVisible({ timeout: 10_000 });
});
