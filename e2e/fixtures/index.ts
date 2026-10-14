/**
 * fixtures/index.ts
 *
 * Single combined test instance used as `importTestFrom` in bdd.config.ts.
 * Every generated spec file imports `test` from here.
 *
 * Admin auth strategy:
 *   global-setup.ts signs in once and writes playwright/.auth/admin.json.
 *   The Before({ tags: '@admin' }) hook in common.steps.ts loads that
 *   storageState into the current context — zero logins per test.
 *
 * NOTE: imports only from constants.ts (not global-setup.ts) to avoid
 * bddgen loading the Playwright test() call at module scope.
 */

import { test as base, createBdd } from 'playwright-bdd';
import { ADMIN_STORAGE_STATE, STOREFRONT_PREFIX } from '../support/constants.js';
import type { AuthFixtures } from './auth.fixture.js';
import type { StoreFixtures } from './store.fixture.js';
import type { ProductFixtures } from './product.fixture.js';
import type { CategoryFixtures } from './category.fixture.js';
import type { DiscountFixtures } from './discount.fixture.js';

/** Path prefix for all storefront URLs in tests, e.g. /store/e2e-testing */
export const STORE_BASE = STOREFRONT_PREFIX;
export { ADMIN_STORAGE_STATE };

type AllFixtures = AuthFixtures & StoreFixtures & ProductFixtures & CategoryFixtures & DiscountFixtures;

export const test = base.extend<AllFixtures>({
	// ── Auth markers ──────────────────────────────────────────────────────────
	adminPage: [async ({}, use) => { await use(true); }, { auto: false }],
	customerPage: [async ({}, use) => { await use(true); }, { auto: false }],

	// ── Store base ────────────────────────────────────────────────────────────
	storeBase: async ({}, use) => { await use(STORE_BASE); },

	// ── Product fixture (create via API + teardown) ──────────────────────────
	productFixture: async ({ page }, use) => {
		const ts = Date.now();
		const title = `E2E Fixture Product ${ts}`;
		const slug = `e2e-fixture-product-${ts}`;
		const res = await page.request.post('/api/admin/products', {
			data: { title, slug, basePrice: '50.00', stockQty: 10, isPublished: true }
		});
		if (!res.ok()) throw new Error(`productFixture create failed: ${res.status()}`);
		const created = await res.json() as { id: string; title: string; slug: string };
		await use(created);
		await page.request.delete(`/api/admin/products/${created.id}`).catch(() => {});
	},

	// ── Category fixture (create via API + teardown) ─────────────────────────
	categoryFixture: async ({ page }, use) => {
		const ts = Date.now();
		const name = `E2E Fixture Cat ${ts}`;
		const slug = `e2e-fixture-cat-${ts}`;
		const res = await page.request.post('/api/admin/categories', {
			data: { name, slug, sortOrder: 99 }
		});
		if (!res.ok()) throw new Error(`categoryFixture create failed: ${res.status()}`);
		const created = await res.json() as { id: string; name: string; slug: string };
		await use(created);
		await page.request.delete(`/api/admin/categories/${created.id}`).catch(() => {});
	},

	// ── Discount fixture (stub — managed by discounts.steps.ts directly) ─────
	discountFixture: async ({}, use) => {
		await use({ id: '', code: '' });
	},
});

export const { Given, When, Then, Before, After } = createBdd(test);
