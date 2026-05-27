import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
});

test('loads the route search first on mobile and filters Browse stops', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const routeForm = page.locator('#route-form');
  await expect(routeForm).toBeVisible();
  const formBox = await routeForm.boundingBox();
  expect(formBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);

  const seoCopy = page.locator('.seo-support-copy');
  await expect(seoCopy).toBeVisible();
  const seoBox = await seoCopy.boundingBox();
  expect(formBox?.y ?? 0).toBeLessThan(seoBox?.y ?? 0);

  await page.getByRole('button', { name: 'Browse' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search lines' })).toBeVisible();

  await page.getByRole('button', { name: 'Stops' }).click();
  const stopSearch = page.getByRole('searchbox', { name: 'Search stops' });
  await expect(stopSearch).toBeVisible();

  await stopSearch.fill('Sanremo');
  await expect(page.locator('[data-browse-stop]').filter({ hasText: /Sanremo/i }).first()).toBeVisible();
  await expect(page.locator('.browse-count')).toContainText('matches');
});
