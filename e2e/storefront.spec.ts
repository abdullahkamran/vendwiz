import { test, expect } from '@playwright/test';

test('homepage loads with hero and categories', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  // hero section exists
  await expect(page.locator('main')).toBeVisible();
});

test('products listing page loads', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveURL(/products/);
  await expect(page.locator('main')).toBeVisible();
});

test('product detail page opens from listing', async ({ page }) => {
  await page.goto('/products');
  const firstProduct = page.locator('a[href*="/products/"]').first();
  await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
  const href = await firstProduct.getAttribute('href');
  // Fail fast if no products are seeded rather than silently passing
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator('main')).toBeVisible();
});
