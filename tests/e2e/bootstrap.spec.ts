import { test, expect } from '@playwright/test';
test('SSR delivers useful accessible HTML without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Changuito' })).toBeVisible();
  await expect(page.getByText('Entorno técnico disponible')).toBeVisible();
  await context.close();
});
test('hydrates and navigates through real Inertia on mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Comprobar interacción' }).click();
  await expect(page.getByRole('status')).toHaveText('Interacción lista');
  await page.evaluate(() => Reflect.set(window, '__bootstrapNavigationProbe', true));
  await page.getByRole('link', { name: 'Verificación', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/bootstrap/check');
  await expect(page.getByText('Pantalla: verificación')).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__bootstrapNavigationProbe'))).toBe(true);
  expect(errors).toEqual([]);
});
