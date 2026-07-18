import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  DEV_PASSWORD,
  TEACHER_EMAIL,
  TEACHER_PHONE,
  loginAs,
} from './helpers/auth';
import { waitForRecoveryOtp } from './helpers/otp';

const NEW_TEACHER_PASSWORD = 'RecoveredPassword123!';

test.describe('P0-WEB-05 — Login + recovery OTP', () => {
  test('invalid login shows an error', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, 'WrongPassword!!!');
    await expect(page.getByText(/failed|invalid|credentials|error/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test('forgot-password link opens recovery page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(
      page.getByRole('heading', { name: 'Password recovery' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\/recovery/);
  });

  test('full recovery OTP flow then login with new password', async ({
    page,
  }) => {
    await page.goto('/login/recovery');
    await page.getByLabel('Mobile number').fill(TEACHER_PHONE);
    await page.getByRole('button', { name: 'Send recovery OTP' }).click();

    await expect(page.getByText(/Recovery OTP sent|OTP/i)).toBeVisible({
      timeout: 15_000,
    });

    const otp = await waitForRecoveryOtp(TEACHER_PHONE);
    await page.getByLabel('OTP').fill(otp);
    await page.getByLabel('New password').fill(NEW_TEACHER_PASSWORD);
    await page.getByRole('button', { name: 'Set new password' }).click();

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login$/);

    await loginAs(page, TEACHER_EMAIL, NEW_TEACHER_PASSWORD);
    await expect(page.getByText('Web companion')).toBeVisible({ timeout: 15_000 });
  });
});
