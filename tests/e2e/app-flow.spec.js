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

test('opens provider search tabs and builds a prefilled FlixBus handoff', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'FlixBus search' }).click();
  await expect(page.getByRole('heading', { name: 'FlixBus search' })).toBeVisible();

  await page.locator('input[name="provider-from"]').fill('Sanremo');
  await page.locator('input[name="provider-to"]').fill('Ventimiglia');
  await page.locator('input[name="provider-date"]').fill('2026-06-01');

  const providerForm = page.locator('[data-provider-search]');
  await expect(providerForm).toHaveAttribute('data-provider-action-url', /departureCity=83f11a76-676c-4cd0-ae59-668e1a716496/);
  await expect(providerForm).toHaveAttribute('data-provider-action-url', /arrivalCity=32183c0e-909d-48ce-8c32-7a0f77b4db5c/);
  await expect(providerForm).toHaveAttribute('data-provider-action-url', /rideDate=01.06.2026/);

  await page.getByRole('button', { name: 'Train search' }).click();
  await expect(page.getByRole('heading', { name: 'Train search' })).toBeVisible();
  await page.locator('input[name="provider-from"]').fill('Imperia');
  await page.locator('input[name="provider-to"]').fill('Sanremo');
  await page.locator('input[name="provider-date"]').fill('2026-06-01');
  await expect(page.locator('[data-provider-search]')).toHaveAttribute('data-provider-action-url', /Channels.Website.WEB\/website\/auth\/handoff/);
  await expect(page.locator('[data-provider-search]')).toHaveAttribute('data-provider-action-url', /departureStation=Imperia/);
  await expect(page.locator('[data-provider-search]')).toHaveAttribute('data-provider-action-url', /arrivalStation=Sanremo/);
  await expect(page.locator('[data-provider-search]')).toHaveAttribute('data-provider-action-url', /departureDate=01-06-2026/);

  await page.getByRole('button', { name: 'BlaBlaCar search' }).click();
  await expect(page.getByRole('heading', { name: 'BlaBlaCar search' })).toBeVisible();
});

test('shows route action feedback and opens a tracked share modal', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copiedText = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => {
          window.__copiedText = text;
        },
      },
      configurable: true,
    });
  });

  await page.goto('/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=lines');

  await page.getByRole('button', { name: 'Save route' }).click();
  await expect(page.locator('.route-action-feedback')).toContainText('Route saved');

  await page.getByRole('button', { name: 'Show departures' }).click();
  await expect(page.locator('.route-action-feedback')).toHaveCount(0);

  await page.getByRole('button', { name: 'Share' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share route' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Direct link')).toHaveValue(/utm_source=share_link/);
  await expect(dialog.getByLabel('Direct link')).toHaveValue(/utm_medium=route_share/);
  await expect(dialog.getByLabel('Direct link')).toHaveValue(/utm_campaign=azzuriva_route_share/);

  await dialog.getByRole('button', { name: 'Copy link' }).click();
  await expect(dialog.locator('.share-modal-status')).toContainText('Link copied');

  const routeActionEvents = await page.evaluate(() => (
    window.dataLayer.filter((entry) => entry.event === 'route_save' || entry.event === 'route_share')
  ));
  const copiedText = await page.evaluate(() => window.__copiedText);

  expect(copiedText).toContain('utm_source=share_link');
  expect(routeActionEvents).toEqual([
    expect.objectContaining({
      event: 'route_save',
      from: 'Porto Maurizio',
      to: 'Sanremo Autostazione',
      day_type: 'feriale',
      save_status: 'saved',
    }),
    expect.objectContaining({
      event: 'route_share',
      share_method: 'link',
      share_url: expect.stringContaining('utm_source=share_link'),
    }),
  ]);
});
