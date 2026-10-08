import { test, expect } from '@playwright/test';

test('confirmation page renders order reference from URL', async ({ page }) => {
  await page.goto('/checkout/confirmation?ref=TEST-001');
  // Page should not redirect away (ref is read from URL params client-side)
  await expect(page).toHaveURL(/checkout\/confirmation/);
  // Confirmation page renders "#{orderRef}" — regex matches regardless of the literal # prefix
  await expect(page.getByText(/TEST-001/).first()).toBeVisible({ timeout: 10000 });
});
