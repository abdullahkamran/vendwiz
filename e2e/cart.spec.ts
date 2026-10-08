import { test, expect } from '@playwright/test';
import { addFirstProductToCart } from './helpers';

test('add product to cart', async ({ page }) => {
  await addFirstProductToCart(page);

  // Navigate to cart and confirm at least one cart item row is rendered
  await page.goto('/cart');
  await expect(page.locator('.cart-item').first()).toBeVisible({ timeout: 10000 });
});

test('cart page has discount code input', async ({ page }) => {
  // Discount input lives inside {:else} of {#if $cart.length === 0}, so cart must be non-empty
  await addFirstProductToCart(page);
  await page.goto('/cart');
  await expect(page.getByPlaceholder('Discount code')).toBeVisible({ timeout: 10000 });
});
