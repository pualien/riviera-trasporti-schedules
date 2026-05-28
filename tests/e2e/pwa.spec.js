import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
});

test('keeps the route search app usable after an offline reload', async ({ context, page }) => {
  await page.goto('/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale');
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: /Find direct Riviera Trasporti buses/i })).toBeVisible();
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
  await expect(page.locator('[data-pwa-control]')).toContainText('Offline');

  await context.setOffline(false);
});

test('keeps a generated route page available after the SEO cache warm-up', async ({ context, page }) => {
  await page.goto('/routes/sanremo/ventimiglia/');
  await expect(page.getByRole('heading', { name: 'Bus Sanremo - Ventimiglia' })).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.waitForTimeout(500);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Bus Sanremo - Ventimiglia' })).toBeVisible();
  await expect(page.locator('main.seo-page')).toContainText('Prime partenze');

  await context.setOffline(false);
});

test('exposes manifest install metadata from the root app', async ({ page }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('./manifest.webmanifest');

  const manifest = await page.evaluate(async () => {
    const response = await fetch(document.querySelector('link[rel="manifest"]').href);
    return response.json();
  });

  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
    './?tab=search',
    './?tab=browse',
    './?tab=saved',
  ]);
  expect(manifest.screenshots.map((screenshot) => screenshot.src)).toEqual([
    './assets/brand/pwa-screenshot-desktop.png',
    './assets/brand/pwa-screenshot-mobile.png',
  ]);
});
