import { test, expect } from '@playwright/test';

test('track page renders order ref and email fields', async ({ page }) => {
  await page.goto('/track');
  // ref input: no id, identified by placeholder (confirmed at +page.svelte:66)
  await expect(page.getByPlaceholder('e.g. ABC12345')).toBeVisible({ timeout: 10000 });
  // email input: type="email" (confirmed at +page.svelte:71)
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('track page shows "not found" for unknown ref', async ({ page }) => {
  await page.goto('/track');
  await page.getByPlaceholder('e.g. ABC12345').fill('UNKNOWN-999');
  await page.locator('input[type="email"]').fill('test@test.com');
  await page.getByRole('button', { name: /track order/i }).click();
  // Component sets result = 'not_found' on 4xx and renders "Order not found"
  await expect(page.getByText('Order not found')).toBeVisible({ timeout: 10000 });
});
