import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('P0-WEB-04 — Admin calendar wizard', () => {
  test('festival review → approve → teaching days with counts', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Seed has a draft calendar — wizard opens at step 2 (festivals)
    await expect(
      page.getByRole('heading', { name: 'School calendar wizard' }),
    ).toBeVisible();
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 30_000 });

    const continueApprove = page.getByRole('button', {
      name: 'Continue to approve',
    });
    await expect(continueApprove).toBeVisible({ timeout: 30_000 });
    await continueApprove.click();

    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Approve calendar' }).click();

    await expect(
      page.getByRole('button', { name: 'Already approved' }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole('heading', { name: 'Teaching days' })).toBeVisible();
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 30_000 });

    const dayCounts = page.locator('dd').filter({ hasText: /\d+ days/ });
    await expect(dayCounts.first()).toBeVisible();
    const texts = await dayCounts.allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      const match = text.match(/(\d+)/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThan(0);
    }
  });
});
