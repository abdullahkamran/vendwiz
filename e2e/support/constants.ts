/**
 * constants.ts — E2E test constants shared across fixtures, step definitions,
 * and global-setup without importing any Playwright test primitives.
 */

export const E2E_SUBDOMAIN = 'e2e-testing';
export const E2E_STORE_NAME = 'E2E Test Store';
export const E2E_LICENSE_KEY = 'E2E-TEST-LICENSE';
export const E2E_ADMIN_EMAIL = 'admin@e2e-testing.local';
export const E2E_ADMIN_PASS = 'e2e-admin-pass';
export const E2E_ADMIN_NAME = 'E2E Admin';
export const STOREFRONT_PREFIX = `/store/${E2E_SUBDOMAIN}`;
export const E2E_AUTH_ORIGIN = process.env.BASE_URL ?? 'http://localhost:5173';
export const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';
