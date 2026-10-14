/**
 * discounts.steps.ts — step definitions for admin discounts feature.
 *
 * Selector notes (verified against DiscountForm.svelte and discounts/+page.svelte):
 *   Code input:    #code  (name="code")
 *   Type radio:    input[type="radio"][name="type"][value="percentage|fixed"]
 *   Value input:   #value  (name="value")
 *   Active toggle: input[type="checkbox"][name="isActive"]  (sr-only — use force)
 *   Submit:        button[type="submit"]  (inside the DiscountForm)
 *   Delete:        button.btn-delete in row → ConfirmDialog → button.btn-danger
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';

Given('I am on the admin discounts page', async ({ page }) => {
	await page.goto('/admin/discounts');
	await page.waitForLoadState('networkidle');
});

Given('I am on the new discount page', async ({ page }) => {
	await page.goto('/admin/discounts/new');
	await page.waitForLoadState('networkidle');
});

Then('the discounts page loads successfully', async ({ page }) => {
	await expect(page.getByText('Discount Codes', { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I enter the discount code {string}', async ({ page }, code: string) => {
	await page.locator('#code').fill(code);
});

When('I select the discount type {string}', async ({ page }, type: string) => {
	await page.locator(`input[type="radio"][name="type"][value="${type}"]`).check();
});

When('I set the discount value to {string}', async ({ page }, value: string) => {
	await page.locator('#value').fill(value);
});

When('I submit the discount form', async ({ page }) => {
	// The DiscountForm uses button[type="submit"] inside the form
	await page.locator('form button[type="submit"]').last().click();
	// After submit, navigate to /admin/discounts list
	await page.waitForURL(/\/admin\/discounts(?:\/|$)(?!new)/, { timeout: 15_000 });
	await page.waitForLoadState('networkidle');
});

Then('I see the discount code {string} in the discounts list', async ({ page }, code: string) => {
	await page.goto('/admin/discounts');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(code, { exact: false })).toBeVisible({ timeout: 10_000 });
});

When('I delete the discount {string}', async ({ page }, code: string) => {
	// The row's .btn-delete triggers the ConfirmDialog (not native confirm())
	const row = page.locator(`tr:has-text("${code}")`).first();
	await row.waitFor({ timeout: 10_000 });
	await row.locator('button.btn-delete').click();
	// ConfirmDialog has a .btn-danger confirm button (variant="danger")
	await page.locator('.cd-footer button.btn-danger').waitFor({ timeout: 5_000 });
	await page.locator('.cd-footer button.btn-danger').click();
	await page.waitForLoadState('networkidle');
});

Then('the discount {string} is not in the discounts list', async ({ page }, code: string) => {
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(code, { exact: false })).not.toBeVisible({ timeout: 5_000 });
});
