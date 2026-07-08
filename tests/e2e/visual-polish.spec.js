import { expect, test } from '@playwright/test';

const SEARCH_ROUTE = '/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=lines';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'it');
  });
});

async function tabLabelCenterOffset(page, label) {
  const tab = page.getByRole('button', { name: label });
  await expect(tab).toBeVisible();

  return tab.evaluate((element) => {
    const labelElement = element.querySelector('span:last-child');
    if (!labelElement) {
      return Number.POSITIVE_INFINITY;
    }

    const buttonBox = element.getBoundingClientRect();
    const labelBox = labelElement.getBoundingClientRect();

    return Math.abs(
      (buttonBox.left + buttonBox.width / 2)
        - (labelBox.left + labelBox.width / 2),
    );
  });
}

function relativeLuminance({ r, g, b }) {
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

async function solidColorPair(locator) {
  return locator.evaluate((element) => {
    function parseRgb(value) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return null;
      }

      const [r, g, b, a = 1] = match[1]
        .split(',')
        .map((part) => Number.parseFloat(part.trim()));

      return { r, g, b, a };
    }

    const style = getComputedStyle(element);
    return {
      background: parseRgb(style.backgroundColor),
      color: parseRgb(style.color),
    };
  });
}

async function effectiveColorPair(locator) {
  return locator.evaluate((element) => {
    function parseRgb(value) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return null;
      }

      const [r, g, b, a = 1] = match[1]
        .split(',')
        .map((part) => Number.parseFloat(part.trim()));

      return { r, g, b, a };
    }

    const color = parseRgb(getComputedStyle(element).color);
    let current = element;

    while (current) {
      const background = parseRgb(getComputedStyle(current).backgroundColor);
      if (background && background.a > 0) {
        return { background, color };
      }

      current = current.parentElement;
    }

    return { background: null, color };
  });
}

test('keeps text-only tabs optically centered', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 800 });
  await page.goto('/');

  await expect(tabLabelCenterOffset(page, 'Sfoglia')).resolves.toBeLessThanOrEqual(1);
  await expect(tabLabelCenterOffset(page, 'Salvati')).resolves.toBeLessThanOrEqual(1);
});

test('keeps the Riviera Dei Fiori Route Finder wordmark readable', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 800 });
  await page.goto('/');

  const letterSpacing = await page.locator('.brand-wordmark').evaluate((element) => (
    getComputedStyle(element).letterSpacing === 'normal'
      ? 0
      : Number.parseFloat(getComputedStyle(element).letterSpacing)
  ));

  expect(letterSpacing).toBeGreaterThan(-2.5);
});

test('styles departure share controls as Riviera Dei Fiori Route Finder actions', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 800 });
  await page.goto(SEARCH_ROUTE);

  const shareAction = page.locator('[data-share-departure]').first();
  await expect(shareAction).toBeVisible();

  const style = await shareAction.evaluate((element) => {
    const computed = getComputedStyle(element);

    return {
      borderRadius: Number.parseFloat(computed.borderTopLeftRadius),
      minHeight: Number.parseFloat(computed.minHeight),
      cursor: computed.cursor,
    };
  });

  expect(style.borderRadius).toBeGreaterThanOrEqual(16);
  expect(style.minHeight).toBeGreaterThanOrEqual(34);
  expect(style.cursor).toBe('pointer');
});

test('keeps dark-mode mobile navigation controls readable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const controls = [
    page.getByRole('button', { name: 'Cerca treni' }),
    page.getByRole('button', { name: 'Cerca FlixBus' }),
    page.getByRole('button', { name: 'Cerca BlaBlaCar' }),
    page.getByRole('button', { name: 'Sfoglia' }),
    page.getByRole('button', { name: 'Salvati' }),
    page.locator('.topbar-more-summary'),
  ];

  for (const control of controls) {
    await expect(control).toBeVisible();
    const pair = await solidColorPair(control);

    expect(pair.color).toBeTruthy();
    expect(pair.background).toBeTruthy();
    expect(pair.background.a).toBe(1);
    expect(contrastRatio(pair.color, pair.background)).toBeGreaterThanOrEqual(4.5);
  }
});

test('keeps taxi alternative sections readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const taxiDirectory = page.locator('.taxi-directory-section').first();
  await expect(taxiDirectory).toBeVisible();

  const readableTargets = [
    taxiDirectory.locator('.taxi-section-head h3').first(),
    taxiDirectory.locator('.taxi-section-head p').first(),
    taxiDirectory.locator('.taxi-panel-entry .eyebrow').first(),
    taxiDirectory.locator('.taxi-panel-entry h4').first(),
    taxiDirectory.locator('.taxi-panel-entry-copy > p:not(.eyebrow):not(.taxi-panel-entry-meta)').first(),
    taxiDirectory.locator('.taxi-panel-entry-coverage').first(),
    taxiDirectory.locator('.taxi-panel-entry-meta').first(),
    taxiDirectory.locator('.taxi-panel-entry-meta a').first(),
    taxiDirectory.locator('.taxi-call-button').first(),
  ];

  for (const target of readableTargets) {
    await expect(target).toBeVisible();
    const pair = await effectiveColorPair(target);

    expect(pair.color).toBeTruthy();
    expect(pair.background).toBeTruthy();
    expect(pair.background.a).toBeGreaterThanOrEqual(0.95);
    expect(contrastRatio(pair.color, pair.background)).toBeGreaterThanOrEqual(4.5);
  }
});
