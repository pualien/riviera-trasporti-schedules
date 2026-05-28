import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
});

const SEARCH_ROUTE = '/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=lines';
const SAVED_ROUTES_STORAGE_KEY = 'riviera:saved-routes';

const SAVED_RESTORE_ROUTE = {
  fromInput: 'Sanremo Autostazione',
  fromLocalityId: null,
  fromStopId: 'sanremo-autostazione',
  toInput: 'Porto Maurizio',
  toStopId: 'imperia-porto-maurizio',
  dayType: 'feriale',
  resultType: 'results',
  resultCount: 4,
  timestamp: '2026-05-14T09:00:00.000Z',
  identity: 'Sanremo Autostazione|sanremo-autostazione|Porto Maurizio|imperia-porto-maurizio|feriale',
};

const NO_DIRECT_SHARED_ROUTE = '/?tab=search&from=Albenga&fromLocality=albenga&fromStop=albenga&to=bastia+%2F+leca&toStop=bastia-%2F-leca&day=feriale&browse=lines&share=route&utm_medium=route_share';

async function firstTripKeyForSharedRoute(page) {
  await page.goto(SEARCH_ROUTE);
  const firstDeparture = page.locator('[data-trip-key]').first();
  await expect(firstDeparture).toBeVisible();
  const tripKey = await firstDeparture.getAttribute('data-trip-key');

  expect(tripKey).toBeTruthy();
  return tripKey;
}

async function openSharedDeparture(page) {
  const tripKey = await firstTripKeyForSharedRoute(page);
  await page.goto(`${SEARCH_ROUTE}&share=departure&trip=${encodeURIComponent(tripKey)}&utm_medium=route_share`);
  await expect(page.locator('.shared-route-context')).toContainText('The shared departure was found in this timetable.');
  await expect(page.locator(`[data-trip-key="${tripKey}"]`).first()).toHaveClass(/departure-card--selected/);

  return tripKey;
}

async function seedSavedRoutes(page) {
  await page.addInitScript(({ storageKey, route }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      favorites: [route],
      recents: [route],
    }));
  }, {
    storageKey: SAVED_ROUTES_STORAGE_KEY,
    route: SAVED_RESTORE_ROUTE,
  });
}

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
  await page.addInitScript(() => {
    window.__openedProviderUrls = [];
    window.open = (url) => {
      window.__openedProviderUrls.push(String(url));
      return null;
    };
  });

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

  await page.locator('[data-provider-search]').evaluate((form) => form.requestSubmit());
  const providerEvents = await page.evaluate(() => (
    window.dataLayer.filter((entry) => entry.event === 'outbound_click')
  ));
  const openedUrls = await page.evaluate(() => window.__openedProviderUrls);

  expect(openedUrls).toHaveLength(1);
  expect(providerEvents).toContainEqual(expect.objectContaining({
    event: 'outbound_click',
    target_type: 'train',
    context: 'provider_tab',
  }));

  await page.getByRole('button', { name: 'BlaBlaCar search' }).click();
  await expect(page.getByRole('heading', { name: 'BlaBlaCar search' })).toBeVisible();
});

test('attributes SEO app CTA traffic to SEO source context', async ({ page }) => {
  await page.goto(
    `${SEARCH_ROUTE}&utm_source=seo_route&utm_medium=seo_page&utm_campaign=azzuriva_seo`,
    { referer: 'http://127.0.0.1:4173/routes/imperia/sanremo/' },
  );
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();

  const growthEvents = await page.evaluate(() => (
    window.dataLayer.filter((entry) => (
      entry.event === 'landing_context'
      || entry.event === 'route_result_viewed'
    ))
  ));

  expect(growthEvents).toEqual([
    expect.objectContaining({
      event: 'landing_context',
      utm_source: 'seo_route',
      utm_medium: 'seo_page',
      utm_campaign: 'azzuriva_seo',
      referrer_type: 'seo',
    }),
    expect.objectContaining({
      event: 'route_result_viewed',
      source_context: 'seo',
    }),
  ]);
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

  await page.getByRole('button', { name: /^Share$/ }).click();
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

test('uses native sharing for route shares when available', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeSharePayloads = [];
    Object.defineProperty(navigator, 'share', {
      value: async (payload) => {
        window.__nativeSharePayloads.push(payload);
      },
      configurable: true,
    });
  });

  await page.goto(SEARCH_ROUTE);

  await page.getByRole('button', { name: /^Share$/ }).click();

  await expect(page.getByRole('dialog', { name: 'Share route' })).toHaveCount(0);

  const sharePayloads = await page.evaluate(() => window.__nativeSharePayloads);
  const routeShareEvents = await page.evaluate(() => (
    window.dataLayer.filter((entry) => entry.event === 'route_share')
  ));

  expect(sharePayloads).toHaveLength(1);
  expect(sharePayloads[0].url).toContain('utm_source=share_native');
  expect(routeShareEvents).toEqual([
    expect.objectContaining({
      event: 'route_share',
      share_method: 'native',
      share_url: expect.stringContaining('utm_source=share_native'),
    }),
  ]);
});

test('uses native sharing source for departure shares when available', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeSharePayloads = [];
    Object.defineProperty(navigator, 'share', {
      value: async (payload) => {
        window.__nativeSharePayloads.push(payload);
      },
      configurable: true,
    });
  });

  await page.goto(SEARCH_ROUTE);
  await page.locator('[data-share-departure]').first().click();

  const sharePayloads = await page.evaluate(() => window.__nativeSharePayloads);
  const routeShareEvents = await page.evaluate(() => (
    window.dataLayer.filter((entry) => entry.event === 'route_share')
  ));

  expect(sharePayloads).toHaveLength(1);
  expect(sharePayloads[0].url).toContain('share=departure');
  expect(sharePayloads[0].url).toContain('utm_source=share_native');
  expect(routeShareEvents).toEqual([
    expect.objectContaining({
      event: 'route_share',
      share_method: 'native',
      share_url: expect.stringContaining('utm_source=share_native'),
    }),
  ]);
});

test('falls back to the route share modal when native sharing aborts', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeShareCalls = 0;
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        window.__nativeShareCalls += 1;
        throw new DOMException('Dismissed', 'AbortError');
      },
      configurable: true,
    });
  });

  await page.goto(SEARCH_ROUTE);

  await page.getByRole('button', { name: /^Share$/ }).click();

  await expect(page.getByRole('dialog', { name: 'Share route' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__nativeShareCalls)).toBe(1);
});

test('falls back to the departure share modal when native sharing aborts', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        throw new DOMException('Dismissed', 'AbortError');
      },
      configurable: true,
    });
  });

  await page.goto(SEARCH_ROUTE);
  await page.locator('[data-share-departure]').first().click();

  const dialog = page.getByRole('dialog', { name: 'Share route' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Direct link')).toHaveValue(/share=departure/);
});

test('restores inbound shared departure context from a real trip key', async ({ page }) => {
  await openSharedDeparture(page);

  await expect(page.getByRole('heading', { name: 'Selected trip details' })).toBeVisible();
});

test('clears inbound shared departure context after a manual search submission', async ({ page }) => {
  await openSharedDeparture(page);

  await page.getByRole('button', { name: 'Show departures' }).click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared departure context when reversing the shared route', async ({ page }) => {
  await openSharedDeparture(page);

  await page.getByRole('button', { name: 'Reverse' }).click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared departure context after restoring a saved route', async ({ page }) => {
  await seedSavedRoutes(page);
  await openSharedDeparture(page);

  await page.getByRole('button', { name: 'Saved' }).click();
  await page.getByRole('button', { name: /Sanremo Autostazione -> Porto Maurizio/ }).first().click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared departure context after restoring a recent route', async ({ page }) => {
  await seedSavedRoutes(page);
  await openSharedDeparture(page);

  await page.getByRole('button', { name: 'Saved' }).click();
  await page.locator('[data-recent-route]').first().click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared departure context after Browse seeds a route', async ({ page }) => {
  await openSharedDeparture(page);

  await page.getByRole('button', { name: 'Browse' }).click();
  await page.getByRole('button', { name: 'Stops' }).click();
  await page.getByRole('searchbox', { name: 'Search stops' }).fill('Sanremo Autostazione');
  await page.locator('[data-browse-stop="sanremo-autostazione"]').click();
  await page.getByRole('button', { name: 'Search to here' }).first().click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared route context after a no-direct correction action', async ({ page }) => {
  await page.goto(NO_DIRECT_SHARED_ROUTE);
  await expect(page.locator('.fallback-suggestion-button').first()).toBeVisible();

  await page.locator('.fallback-suggestion-button').first().click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
});

test('clears inbound shared departure context after choosing a nearby destination stop', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 43.817,
          longitude: 7.776,
        },
      });
    };
  });
  await page.route('https://overpass-api.de/api/interpreter', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 43.817,
            lon: 7.776,
            tags: { name: 'Diano Marina' },
          },
        ],
      }),
    });
  });

  await openSharedDeparture(page);
  await page.locator('[data-location-field="to"]').click();
  await page.locator('.nearby-stop').first().click();

  await expect(page.locator('.shared-route-context')).toHaveCount(0);
  await expect(page.locator('[name="to"]')).toHaveValue(/diano marina/i);
});
