/**
 * global-setup.ts
 *
 * Runs once before the Playwright test suite (via the "setup" project).
 *
 * 1. Connects to DATABASE_URL and idempotently inserts the E2E test store,
 *    license key, admin user, one category, and one product.
 * 2. Purges leftover mutable fixtures from previous runs so create/edit/delete
 *    scenarios don't fail on slug uniqueness constraints.
 * 3. Signs in as admin via the login form (browser, correct Origin) and writes
 *    storageState to playwright/.auth/admin.json for use by @admin scenarios.
 */

import { test as setup } from '@playwright/test';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';

// Re-export constants so that step files can import them from here for
// backward-compat — but the source of truth is constants.ts
export {
	E2E_SUBDOMAIN,
	E2E_STORE_NAME,
	E2E_LICENSE_KEY,
	E2E_ADMIN_EMAIL,
	E2E_ADMIN_PASS,
	E2E_ADMIN_NAME,
	STOREFRONT_PREFIX,
	E2E_AUTH_ORIGIN,
	ADMIN_STORAGE_STATE,
} from './constants.js';

import {
	E2E_SUBDOMAIN,
	E2E_STORE_NAME,
	E2E_LICENSE_KEY,
	E2E_ADMIN_EMAIL,
	E2E_ADMIN_PASS,
	E2E_ADMIN_NAME,
	ADMIN_STORAGE_STATE,
} from './constants.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

setup('seed E2E test store and save admin session', async ({ page }) => {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL env var is required for global-setup');

	const sql = postgres(databaseUrl, { max: 1 });

	try {
		// ── 1. License key ────────────────────────────────────────────────────────
		const [existingLicense] = await sql`
      SELECT id FROM license_keys WHERE code = ${E2E_LICENSE_KEY}
    `;
		let licenseId: string;
		if (existingLicense) {
			licenseId = existingLicense.id;
		} else {
			licenseId = nanoid();
			await sql`
        INSERT INTO license_keys (id, code, created_at)
        VALUES (${licenseId}, ${E2E_LICENSE_KEY}, now())
      `;
		}

		// ── 2. Admin user via better-auth (handles scrypt hashing) ────────────────
		const [existingUser] = await sql`
      SELECT id FROM users WHERE email = ${E2E_ADMIN_EMAIL}
    `;
		let adminUserId: string;

		if (existingUser) {
			adminUserId = existingUser.id;
		} else {
			// Register via better-auth's sign-up endpoint so the password is hashed correctly
			const signUpRes = await page.request.post(`${BASE_URL}/api/auth/sign-up/email`, {
				headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
				data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASS, name: E2E_ADMIN_NAME }
			});
			if (!signUpRes.ok()) {
				const body = await signUpRes.text();
				throw new Error(`Admin sign-up failed: HTTP ${signUpRes.status()} — ${body}`);
			}
			const [newUser] = await sql`
        SELECT id FROM users WHERE email = ${E2E_ADMIN_EMAIL}
      `;
			if (!newUser) throw new Error('Admin user not found after sign-up');
			adminUserId = newUser.id;
		}

		// ── 3. Store ──────────────────────────────────────────────────────────────
		const [existingStore] = await sql`
      SELECT id FROM stores WHERE subdomain = ${E2E_SUBDOMAIN}
    `;
		let storeId: string;

		if (existingStore) {
			storeId = existingStore.id;
			await sql`
        UPDATE stores
        SET is_active = true, owner_id = ${adminUserId}, name = ${E2E_STORE_NAME}
        WHERE id = ${storeId}
      `;
		} else {
			storeId = nanoid();
			await sql`
        INSERT INTO stores (
          id, owner_id, subdomain, name, is_active, verification_code,
          currency_code, currency_symbol, shipping_fee, tax_rate, created_at, updated_at
        ) VALUES (
          ${storeId}, ${adminUserId}, ${E2E_SUBDOMAIN}, ${E2E_STORE_NAME},
          true, ${E2E_LICENSE_KEY}, 'PKR', 'Rs.', '0', '0', now(), now()
        )
      `;
		}

		// Link license to store
		await sql`
      UPDATE license_keys
      SET used_by_store_id = ${storeId}, used_at = now()
      WHERE code = ${E2E_LICENSE_KEY}
    `;

		// ── 4. Purge leftover mutable fixtures from prior runs ────────────────────
		const leftovers = ['E2E Create Test', 'E2E Edited Product', 'E2E New Cat', 'E2ETEST10'];

		await sql`
      DELETE FROM products
      WHERE store_id = ${storeId} AND title = ANY(${leftovers}::text[])
    `;
		await sql`
      DELETE FROM categories
      WHERE store_id = ${storeId} AND name = ANY(${leftovers}::text[])
    `;
		await sql`
      DELETE FROM discount_codes
      WHERE store_id = ${storeId} AND code = ANY(${leftovers}::text[])
    `;

		// ── 5. Default category ───────────────────────────────────────────────────
		const [existingCat] = await sql`
      SELECT id FROM categories
      WHERE store_id = ${storeId} AND name = 'E2E Category'
    `;
		let categoryId: string;

		if (existingCat) {
			categoryId = existingCat.id;
		} else {
			categoryId = nanoid();
			await sql`
        INSERT INTO categories (id, store_id, name, slug, sort_order, is_default, created_at)
        VALUES (${categoryId}, ${storeId}, 'E2E Category', 'e2e-category', 0, false, now())
      `;
		}

		// ── 6. Default product ────────────────────────────────────────────────────
		const [existingProduct] = await sql`
      SELECT id FROM products
      WHERE store_id = ${storeId} AND slug = 'e2e-product'
    `;

		if (!existingProduct) {
			const productId = nanoid();
			await sql`
        INSERT INTO products (
          id, store_id, category_id, title, slug, base_price,
          stock_qty, is_published, is_default, sort_order,
          images, track_inventory, low_stock_threshold,
          created_at, updated_at
        ) VALUES (
          ${productId}, ${storeId}, ${categoryId}, 'E2E Product', 'e2e-product', '100.00',
          50, true, false, 0,
          '[]', true, 5,
          now(), now()
        )
      `;
		}
	} finally {
		await sql.end();
	}

	// ── 7. Sign in via browser form and save storageState ────────────────────
	const authDir = path.dirname(ADMIN_STORAGE_STATE);
	if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

	await page.goto(`${BASE_URL}/login`);
	await page.locator('#email').fill(E2E_ADMIN_EMAIL);
	await page.locator('#password').fill(E2E_ADMIN_PASS);
	await page.locator('button[type="submit"]').click();

	// Wait for redirect to /admin or /onboarding
	await page.waitForURL(/\/(admin|onboarding)/, { timeout: 30_000 });

	// If redirected to onboarding, navigate to /admin — the store is seeded
	if (page.url().includes('/onboarding')) {
		await page.goto(`${BASE_URL}/admin`);
		await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15_000 });
	}

	await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
