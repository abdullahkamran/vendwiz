/**
 * cart.steps.ts — step definitions for storefront cart feature.
 *
 * Cart is stored in client-side localStorage via a Svelte store.
 * To add E2E Product: navigate to its PDP and click .pdp-btn-atc.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';
import { STORE_BASE } from '../../fixtures/index.js';

const E2E_PRODUCT_SLUG = 'e2e-product';

/** Navigate to E2E Product PDP and add it to the cart. */
async function addE2EProductToCart(page: import('@playwright/test').Page): Promise<void> {
	await page.goto(`${STORE_BASE}/products/${E2E_PRODUCT_SLUG}`);
	await page.waitForLoadState('networkidle');
	await page.locator('button.pdp-btn-atc').click();
	await page.waitForTimeout(300);
}

When('I click the add to cart button', async ({ page }) => {
	await page.locator('button.pdp-btn-atc').click();
	await page.waitForTimeout(300);
});

When('I navigate to the cart page', async ({ page }) => {
	await page.goto(`${STORE_BASE}/cart`);
	await page.waitForLoadState('networkidle');
});

Then('I see {string} in the cart', async ({ page }, title: string) => {
	await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 10_000 });
});

Given('I have {string} in my cart', async ({ page }, _title: string) => {
	await addE2EProductToCart(page);
});

When('I remove {string} from the cart', async ({ page }, _title: string) => {
	// .cart-remove is the "✕ Remove" button for each cart item
	await page.locator('button.cart-remove').first().click();
	await page.waitForTimeout(300);
});

Then('I see the empty cart message', async ({ page }) => {
	await expect(page.getByText('Your cart is empty.', { exact: false })).toBeVisible({ timeout: 10_000 });
});
