import { expect, type Page } from '@playwright/test';

export const ADMIN = {
  email: 'admin@wishly.local',
  password: 'admin-change-me',
};

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/wishlists/, { timeout: 15000 });
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN.email, ADMIN.password);
}

export async function registerUniqueUser(page: Page) {
  const stamp = Date.now();
  const email = `e2e_${stamp}@example.com`;
  const password = 'test-pass-123';
  const name = `E2E User ${stamp}`;
  await page.goto('/register');
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/wishlists/, { timeout: 15000 });
  return { email, password, name };
}
