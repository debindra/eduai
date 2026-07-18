import { test, expect } from '@playwright/test';

test.describe('P0-WEB-02 — API health / typed client contract', () => {
  test('health page shows live API status and database fields', async ({
    page,
  }) => {
    await page.goto('/health');
    await expect(page.getByRole('heading', { name: 'API health' })).toBeVisible();
    await expect(page.getByText('Checking API…')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('dl dt', { hasText: 'Status' })).toBeVisible();
    await expect(
      page.locator('dl dt', { hasText: 'Database configured' }),
    ).toBeVisible();
    await expect(page.locator('dl dt', { hasText: 'Database ok' })).toBeVisible();
    await expect(page.locator('dl dd').first()).toHaveText('ok');
  });
});
