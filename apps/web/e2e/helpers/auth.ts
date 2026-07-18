import type { Page } from '@playwright/test';

export const DEV_PASSWORD = 'DevPassword123!';
export const ADMIN_EMAIL = 'admin@schoolx.dev';
export const TEACHER_EMAIL = 'teacher@schoolx.dev';
export const TEACHER_PHONE = '9811111111';

export async function loginAs(
  page: Page,
  identifier: string,
  password: string = DEV_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL);
  await page.waitForURL('**/admin/calendar');
}

export async function loginAsTeacher(page: Page): Promise<void> {
  await loginAs(page, TEACHER_EMAIL);
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '');
}
