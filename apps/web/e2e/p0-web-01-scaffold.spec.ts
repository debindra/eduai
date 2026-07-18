import { test, expect } from '@playwright/test';

test.describe('P0-WEB-01 — Vite + Svelte 5 + Tailwind scaffold', () => {
  test('home page loads with app name and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Web companion')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'API health check' }),
    ).toBeVisible();
  });
});
