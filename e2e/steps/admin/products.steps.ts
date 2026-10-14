/**
 * products.steps.ts — step definitions for admin products feature.
 *
 * Selector notes (verified against ProductForm.svelte and products/+page.svelte):
 *   Title:   #f-title  (Basic tab — always visible)
 *   Price:   #f-price  (Basic tab — always visible)
 *   Stock:   #f-stock  (Inventory tab — must click the "Inventory" tab first)
 *   Save:    .save-bar button.btn-primary  (sticky save bar)
 *   Edit:    a.btn-edit  (row link in products table)
 *   Delete:  button.btn-delete → custom modal → button.btn-danger
 *
 * URL fix: after create, waitForURL(/\/admin\/products\/(?!new)[^/]+$/) so
 * the regex does NOT match /admin/products/new.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';

Given('I am on the admin products page', async ({ page }) => {
	await page.goto('/admin/products');
	await page.waitForLoadState('networkidle');
});

Given('I am on the new product page', async ({ page }) => {
	await page.goto('/admin/products/new');
	await page.waitForLoadState('networkidle');
});

Then('I see {string} in the product list', async ({ page }, title: string) => {
	await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I enter the product title {string}', async ({ page }, title: string) => {
	await page.locator('#f-title').fill(title);
});

When('I enter the product price {string}', async ({ page }, price: string) => {
	await page.locator('#f-price').fill(price);
});

When('I enter the product stock {string}', async ({ page }, stock: string) => {
	// Stock lives on the Inventory tab — must click it first
	await page.getByRole('tab', { name: /inventory/i }).click();
	await page.locator('#f-stock').waitFor({ state: 'visible', timeout: 5_000 });
	await page.locator('#f-stock').fill(stock);
});

When('I submit the product form', async ({ page }) => {
	await page.locator('.save-bar button.btn-primary').click();
	// Wait for navigation away from /new — regex explicitly excludes /new
	await page.waitForURL(/\/admin\/products\/(?!new)[^/]+$/, { timeout: 20_000 });
	await page.waitForLoadState('networkidle');
});

Then('I am on the product edit page', async ({ page }) => {
	await expect(page).toHaveURL(/\/admin\/products\/(?!new)[^/]+$/);
});

When('I go to the admin products page', async ({ page }) => {
	await page.goto('/admin/products');
	await page.waitForLoadState('networkidle');
});

When('I click the edit link for the product titled {string}', async ({ page }, title: string) => {
	const row = page.locator(`tr:has-text("${title}")`).first();
	await row.waitFor({ timeout: 10_000 });
	await row.locator('a.btn-edit').click();
	await page.waitForLoadState('networkidle');
});

When('I change the product title to {string}', async ({ page }, title: string) => {
	await page.locator('#f-title').clear();
	await page.locator('#f-title').fill(title);
});

Then('the page shows {string}', async ({ page }, text: string) => {
	await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I delete the product titled {string}', async ({ page }, title: string) => {
	await page.goto('/admin/products');
	await page.waitForLoadState('networkidle');

	const row = page.locator(`tr:has-text("${title}")`).first();
	await row.waitFor({ timeout: 10_000 });

	// Click .btn-delete → opens custom confirm modal
	await row.locator('button.btn-delete').click();

	// Wait for the modal's danger button and click it
	await page.locator('button.btn-danger').waitFor({ timeout: 5_000 });
	await page.locator('button.btn-danger').click();
	await page.waitForLoadState('networkidle');
});

Then('{string} is not in the product list', async ({ page }, title: string) => {
	await page.goto('/admin/products');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(title, { exact: false })).not.toBeVisible({ timeout: 5_000 });
});
