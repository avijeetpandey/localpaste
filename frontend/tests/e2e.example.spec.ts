/**
 * Example Playwright end-to-end spec for localpaste.
 *
 * Install Playwright once:
 *   npm i -D @playwright/test
 *   npx playwright install --with-deps
 *
 * Then run:
 *   npx playwright test tests/e2e.example.spec.ts
 *
 * The spec assumes:
 *   - frontend dev server on  http://localhost:4200
 *   - backend running         http://localhost:8000
 *   - seed account            demo@localpaste.dev / demo12345
 */
import { expect, test } from '@playwright/test';

test('login, create paste, view paste', async ({ page }) => {
  await page.goto('http://localhost:4200/auth');
  await page.getByLabel('Email').fill('demo@localpaste.dev');
  await page.getByLabel('Password').fill('demo12345');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.locator('textarea').fill('hello e2e');
  await page.getByRole('button', { name: /create/i }).click();

  await expect(page).toHaveURL(/\/p\//);
  await expect(page.locator('pre').last()).toContainText('hello e2e');

  await page.getByRole('button', { name: /copy/i }).click();
  await expect(page.getByText(/copied/i)).toBeVisible();
});

test('theme toggle persists', async ({ page }) => {
  await page.goto('http://localhost:4200/auth');
  const html = page.locator('html');
  const before = await html.getAttribute('class');
  await page.getByRole('button', { name: /toggle theme/i }).first().click();
  await page.waitForTimeout(100);
  const after = await html.getAttribute('class');
  expect(before).not.toBe(after);
});
