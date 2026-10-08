import { test, expect } from '@playwright/test';

// NOTE: VALID_TYPES in policies/[type]/+page.server.ts:8 uses 'return' (singular),
// not 'returns'. Navigating to /policies/returns would receive a 404 by the whitelist guard.
// The server also 404s when no policy content is seeded — that is acceptable here.
for (const type of ['return', 'shipping']) {
  test(`/policies/${type} responds without a 500 error`, async ({ page }) => {
    const response = await page.goto(`/policies/${type}`);
    // A 404 is acceptable when no policy content is seeded; only a 5xx is a defect.
    expect(response!.status()).toBeLessThan(500);
  });
}
