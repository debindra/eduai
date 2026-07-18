import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsTeacher } from './helpers/auth';

test.describe('P0-WEB-03 — Router permissions + session', () => {
  test('unauthenticated /admin/calendar redirects to login', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('teacher cannot open admin calendar wizard', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.getByText('Web companion')).toBeVisible();

    await page.goto('/admin/calendar');
    await expect(
      page.getByRole('heading', { name: 'School calendar wizard' }),
    ).not.toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin can open calendar wizard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(
      page.getByRole('heading', { name: 'School calendar wizard' }),
    ).toBeVisible();
  });
});
