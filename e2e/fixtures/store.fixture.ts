/**
 * store.fixture.ts
 *
 * Provides STORE_BASE constant for path-based storefront URL construction.
 */

import { STOREFRONT_PREFIX } from '../support/constants.js';

/** Path prefix for all storefront URLs in tests, e.g. /store/e2e-testing */
export const STORE_BASE = STOREFRONT_PREFIX;

export type StoreFixtures = {
	storeBase: string;
};
