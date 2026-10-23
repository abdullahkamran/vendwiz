/**
 * categories.steps.ts — step definitions for admin categories feature.
 *
 * Selector notes (verified against categories/+page.svelte):
 *   New category button:  button text "+ New Category"
 *   Modal name input:     #cat-name
 *   Modal save:           button.btn-primary with text "Save" (onclick, not form submit)
 *   Delete row button:    button.btn-delete → custom modal → button.btn-danger
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';

Given('I am on the admin categories page', async ({ page }) => {
	await page.goto('/admin/categories');
	await page.waitForLoadState('networkidle');
});

Then('I see {string} in the category list', async ({ page }, name: string) => {
	await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I open the new category modal', async ({ page }) => {
	await page.getByRole('button', { name: '+ New Category' }).click();
	await page.locator('#cat-name').waitFor({ state: 'visible', timeout: 5_000 });
});

When('I enter the category name {string}', async ({ page }, name: string) => {
	await page.locator('#cat-name').fill(name);
});

When('I save the category', async ({ page }) => {
	// The modal's save button uses onclick (not form submit)
	await page.locator('button.btn-primary').filter({ hasText: /save/i }).click();
	await page.waitForLoadState('networkidle');
});

When('I delete the category named {string}', async ({ page }, name: string) => {
	const row = page.locator(`tr:has-text("${name}")`).first();
	await row.waitFor({ timeout: 10_000 });
	await row.locator('button.btn-delete').click();
	// Custom confirm modal
	await page.locator('button.btn-danger').waitFor({ timeout: 5_000 });
	await page.locator('button.btn-danger').click();
	await page.waitForLoadState('networkidle');
});

Then('{string} is not in the category list', async ({ page }, name: string) => {
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(name, { exact: false })).not.toBeVisible({ timeout: 5_000 });
});
