import { test, expect } from '@playwright/test';
import { gotoFirstPdp } from './helpers';

test('PDP reviews section is visible', async ({ page }) => {
  await gotoFirstPdp(page);
  // .pdp-reviews-title heading is always rendered (confirmed at +page.svelte:478)
  await expect(page.getByRole('heading', { name: /reviews/i }).first()).toBeVisible({ timeout: 10000 });
});

test('PDP review submission form is present', async ({ page }) => {
  await gotoFirstPdp(page);
  // Review name input (placeholder "Jane Smith"), first star button, and submit button
  await expect(page.getByPlaceholder('Jane Smith')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.star-btn').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Review' })).toBeVisible();
});

test('PDP "You Might Also Like" section renders when related products exist', async ({ page }) => {
  await gotoFirstPdp(page);
  const relatedCards = page.locator('.related-card');
  const count = await relatedCards.count();
  // Explicit reported skip; never a silent pass
  test.skip(count === 0, 'no related products seeded for this product');
  await expect(page.getByRole('heading', { name: /you might also like/i })).toBeVisible();
});
