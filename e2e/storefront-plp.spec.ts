import { test, expect } from '@playwright/test';

test('PLP search input is present and accepts input', async ({ page }) => {
  await page.goto('/products');
  const search = page.locator('input[type="search"]');
  await expect(search).toBeVisible({ timeout: 10000 });
  await search.fill('test query');
  await expect(search).toHaveValue('test query');
});

// .products-filter-btn is display:none !important at min-width:1024px — use mobile viewport
test.describe('PLP filter panel (mobile viewport)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('PLP filter panel opens on mobile viewport', async ({ page }) => {
    await page.goto('/products');
    const filterBtn = page.locator('.products-filter-btn');
    await filterBtn.waitFor({ state: 'visible', timeout: 10000 });
    await filterBtn.click();
    // .filter-backdrop is inside {#if filterOpen} so it only exists when panel is open
    await expect(page.locator('.filter-backdrop')).toBeVisible({ timeout: 5000 });
  });
});

test('PLP sort select is present', async ({ page }) => {
  await page.goto('/products');
  await expect(page.locator('select.products-sort')).toBeVisible({ timeout: 10000 });
});
