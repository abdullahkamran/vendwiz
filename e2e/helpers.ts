import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Navigates to /products, clicks the first product listing, and clicks "Add to cart". */
export async function addFirstProductToCart(page: Page): Promise<void> {
  await page.goto('/products');
  const firstLink = page.locator('a[href*="/products/"]').first();
  await firstLink.waitFor({ state: 'visible', timeout: 10000 });
  await firstLink.click();
  await expect(page).toHaveURL(/\/products\/.+/);
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
}

/**
 * Navigates to /products, asserts (not silently skips) that a first product link exists,
 * then navigates to that PDP and waits for the URL to match.
 */
export async function gotoFirstPdp(page: Page): Promise<void> {
  await page.goto('/products');
  const firstLink = page.locator('a[href*="/products/"]').first();
  await firstLink.waitFor({ state: 'visible', timeout: 10000 });
  const href = await firstLink.getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page).toHaveURL(/\/products\/.+/);
}
