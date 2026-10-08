import { test, expect, type Page } from '@playwright/test';

async function addProductToCart(page: Page) {
  await page.goto('/products');
  const firstLink = page.locator('a[href*="/products/"]').first();
  await firstLink.waitFor({ state: 'visible', timeout: 10000 });
  await firstLink.click();
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
}

test('checkout form renders after adding to cart', async ({ page }) => {
  await addProductToCart(page);
  await page.goto('/checkout');
  await expect(page.locator('input[name="name"], input[placeholder*="name" i]').first()).toBeVisible({ timeout: 10000 });
});

test('checkout redirects to home when cart is empty', async ({ page }) => {
  await page.goto('/checkout');
  // SvelteKit redirects empty cart to home.
  // Use '/' so Playwright resolves it against baseURL (e.g. http://localhost:5173/);
  // a bare regex /^\// would never match because full URLs start with "http", not "/".
  await expect(page).toHaveURL('/');
});
