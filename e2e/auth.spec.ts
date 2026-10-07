import { test, expect } from '@playwright/test';

test('admin redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/login/);
});

test('login page renders email and password fields', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
