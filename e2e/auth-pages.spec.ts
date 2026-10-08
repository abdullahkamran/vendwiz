import { test, expect } from '@playwright/test';

test('register page renders name, email, password fields and submit button', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('#name')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
});

test('forgot-password page renders email field', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
});

for (const route of ['/admin/products', '/admin/orders', '/admin/settings']) {
  test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  });
}
