/**
 * common.steps.ts — shared Before hook and navigation steps.
 *
 * Admin session strategy:
 *   Before({ tags: '@admin' }) loads playwright/.auth/admin.json into the
 *   browser context so every @admin scenario starts pre-authenticated.
 *   This is a storageState restore per scenario — no API sign-in calls.
 */

import { expect } from '@playwright/test';
import { Given, When, Then, Before } from '../fixtures/index.js';
import { ADMIN_STORAGE_STATE } from '../fixtures/index.js';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASS, E2E_AUTH_ORIGIN } from '../support/constants.js';
import * as fs from 'fs';

// ── Admin Before hook ─────────────────────────────────────────────────────────

Before({ tags: '@admin' }, async ({ page }) => {
	// Restore admin cookies from the storageState file written by global-setup
	if (!fs.existsSync(ADMIN_STORAGE_STATE)) {
		throw new Error(`Admin storageState not found at ${ADMIN_STORAGE_STATE}. Run global-setup first.`);
	}
	const saved = JSON.parse(fs.readFileSync(ADMIN_STORAGE_STATE, 'utf-8')) as {
		cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite?: 'Lax' | 'None' | 'Strict' }>;
	};
	await page.context().clearCookies();
	await page.context().addCookies(saved.cookies);
});

// ── Generic navigation steps ──────────────────────────────────────────────────

Given('I am on the login page', async ({ page }) => {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
});

Given('I am on the admin dashboard', async ({ page }) => {
	await page.goto('/admin');
	await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15_000 });
});

// ── Admin auth steps ──────────────────────────────────────────────────────────

When('I visit the admin panel without being logged in', async ({ page }) => {
	await page.context().clearCookies();
	await page.goto('/admin');
});

Then('I am redirected to the login page', async ({ page }) => {
	await page.waitForURL(/\/login/, { timeout: 10_000 });
});

Then('the login page has email and password input fields', async ({ page }) => {
	await page.locator('#email').waitFor({ state: 'visible', timeout: 5_000 });
	await page.locator('#password').waitFor({ state: 'visible', timeout: 5_000 });
});

When('I log in with admin credentials', async ({ page }) => {
	await page.locator('#email').fill(E2E_ADMIN_EMAIL);
	await page.locator('#password').fill(E2E_ADMIN_PASS);
	await page.locator('button[type="submit"]').click();
	await page.waitForURL(/\/(admin|onboarding)/, { timeout: 20_000 });
	if (page.url().includes('/onboarding')) {
		await page.goto('/admin');
		await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15_000 });
	}
});

Then('I land on the admin dashboard', async ({ page }) => {
	await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15_000 });
});

When('I click the sign out button', async ({ page }) => {
	// Click the "Sign out →" link in the admin sidebar
	await page.getByText('Sign out →').click();
	await page.waitForURL(/\/login/, { timeout: 10_000 });
});

When('I sign out via the API', async ({ page }) => {
	await page.request.post('/api/auth/sign-out', {
		headers: { Origin: E2E_AUTH_ORIGIN }
	});
	await page.context().clearCookies();
});

When('I navigate to the admin panel', async ({ page }) => {
	await page.goto('/admin');
});
