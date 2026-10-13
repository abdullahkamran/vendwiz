import { test, expect } from '@playwright/test';

test('track page renders order ref field', async ({ page }) => {
  await page.goto('/track');
  // ref input: identified by placeholder (confirmed at +page.svelte)
  await expect(page.getByPlaceholder('e.g. ORD-ABC12345')).toBeVisible({ timeout: 10000 });
  // email input must NOT be present — tracking by order ref only
  await expect(page.locator('input[type="email"]')).not.toBeVisible();
});

test('track page shows "not found" for unknown ref', async ({ page }) => {
  await page.goto('/track');
  await page.getByPlaceholder('e.g. ORD-ABC12345').fill('UNKNOWN-999');
  await page.getByRole('button', { name: /track order/i }).click();
  // Component sets result = 'not_found' on 4xx and renders "Order not found"
  await expect(page.getByText('Order not found')).toBeVisible({ timeout: 10000 });
});
