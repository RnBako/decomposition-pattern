import { test, expect } from '@playwright/test';
import { loginAsAdmin, registerUniqueUser, ADMIN } from './fixtures/auth';

test.describe('Auth pages', () => {
  test('login form is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('register form is visible', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();
    await expect(page.getByLabel('Имя')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать аккаунт' })).toBeVisible();
  });
});

test.describe('Authenticated smoke', () => {
  test('login admin or register, wishlists, create wishlist, notifications, bookings, share, admin, 404', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Пароль').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    const loggedIn = await page
      .waitForURL(/\/wishlists/, { timeout: 12000 })
      .then(() => true)
      .catch(() => false);

    if (!loggedIn) {
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());
      await registerUniqueUser(page);
    }

    const isAdminSession = loggedIn; // admin login succeeded

    await page.goto('/wishlists');
    await expect(page.getByRole('heading', { name: 'Мои вишлисты' })).toBeVisible({ timeout: 15000 });

    const title = `E2E Wishlist ${Date.now()}`;
    await page.getByRole('link', { name: 'Создать вишлист' }).click();
    await expect(page.getByRole('heading', { name: 'Новый вишлист' })).toBeVisible();
    await page.getByLabel('Название *').fill(title);
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/wishlists\/[^/]+$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 });

    let token: string | null = null;
    const shareCode = page.locator('code').filter({ hasText: '/w/' });
    await expect(async () => {
      if (await shareCode.count()) return;
      const issueBtn = page.getByRole('button', { name: /Выпустить ссылку/ });
      if (await issueBtn.isVisible().catch(() => false)) {
        await issueBtn.click();
      }
      expect(await shareCode.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });
    token = (await shareCode.first().innerText()).replace(/^\/w\//, '').trim();
    expect(token).toBeTruthy();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible({ timeout: 15000 });

    await page.goto('/my-bookings');
    await expect(page.getByRole('heading', { name: 'Мои бронирования' })).toBeVisible({ timeout: 15000 });

    await page.goto(`/w/${token}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 });

    if (isAdminSession) {
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Админ-панель' })).toBeVisible({ timeout: 15000 });
    } else {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/wishlists/, { timeout: 15000 });
      await page.goto('/logout');
      await loginAsAdmin(page);
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Админ-панель' })).toBeVisible({ timeout: 15000 });
    }

    await page.goto('/this-route-does-not-exist-e2e');
    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();
  });
});
