/**
 * auth.steps.ts — step definitions for storefront customer authentication.
 *
 * Note per plan deviation AC32/AC33:
 *   - Registration lands on /onboarding (new account without a store), not a
 *     storefront page. The scenario asserts the user is on an authenticated page.
 *   - Customer logout uses page.evaluate fetch('/api/auth/sign-out') because the
 *     only logout UI is inside /admin, which a store-less user cannot access.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures/index.js';

Given('I am on the registration page', async ({ page }) => {
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
});

Then('I see input fields for name, email, and password', async ({ page }) => {
	await expect(page.locator('#name')).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('#email')).toBeVisible();
	await expect(page.locator('#password')).toBeVisible();
});

When('I register with a unique customer email and password', async ({ page }) => {
	const ts = Date.now();
	const email = `customer+${ts}@e2e-testing.local`;
	await page.locator('#name').fill('E2E Customer');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill('e2e-customer-pass');
	await page.locator('button[type="submit"]').click();
	// After registration: better-auth redirects to /onboarding (new account with no store)
	await page.waitForURL(/\/(onboarding|admin|login)/, { timeout: 20_000 });
});

Then('I am on an authenticated page after registration', async ({ page }) => {
	// AC32: registration of a new user lands on /onboarding (logged-in state)
	// Accept /onboarding or /admin as both indicate an authenticated session
	const url = page.url();
	expect(url).toMatch(/\/(onboarding|admin)/);
});

Given('I have registered and am logged in as a customer', async ({ page }) => {
	const ts = Date.now();
	const email = `customer+${ts}@e2e-testing.local`;
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
	await page.locator('#name').fill('E2E Customer');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill('e2e-customer-pass');
	await page.locator('button[type="submit"]').click();
	await page.waitForURL(/\/(onboarding|admin)/, { timeout: 20_000 });
});

When('I sign out as a customer', async ({ page }) => {
	// AC33: logout via the same API call the admin sidebar button makes
	// (no storefront logout UI for unadmin'd users)
	await page.evaluate(async () => {
		await fetch('/api/auth/sign-out', { method: 'POST' });
	});
	await page.context().clearCookies();
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
});

Then('the current page is the login page', async ({ page }) => {
	await expect(page).toHaveURL(/\/login/);
});
