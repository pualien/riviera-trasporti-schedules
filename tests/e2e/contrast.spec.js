import { expect, test } from '@playwright/test';

const SEARCH_ROUTE = '/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=lines';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'it');
  });
});

async function readContrast(page, targets) {
  return page.evaluate((targetList) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    function parseColor(value) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: alpha / 255 };
    }

    function composite(front, back) {
      const alpha = front.a + back.a * (1 - front.a);

      if (alpha === 0) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }

      return {
        r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha,
        g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha,
        b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha,
        a: alpha,
      };
    }

    function effectiveBackground(element) {
      const layers = [];

      for (let node = element; node; node = node.parentElement) {
        const background = parseColor(getComputedStyle(node).backgroundColor);
        if (background.a > 0) {
          layers.push(background);
        }
      }

      let result = { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 1; index >= 0; index -= 1) {
        result = composite(layers[index], result);
      }
      return result;
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

    function contrastRatio(first, second) {
      const firstLuminance = relativeLuminance(first);
      const secondLuminance = relativeLuminance(second);
      const lighter = Math.max(firstLuminance, secondLuminance);
      const darker = Math.min(firstLuminance, secondLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    }

    return targetList.map(({ name, selector, type = 'text' }) => {
      const element = document.querySelector(selector);
      if (!element) {
        return { name, selector, missing: true };
      }

      const style = getComputedStyle(element);
      const elementBackground = effectiveBackground(element);
      const parentBackground = effectiveBackground(element.parentElement ?? element);

      if (type === 'border') {
        const border = composite(parseColor(style.borderTopColor), parentBackground);
        return {
          name,
          selector,
          ratio: contrastRatio(border, parentBackground),
          borderStyle: style.borderTopStyle,
          borderWidth: Number.parseFloat(style.borderTopWidth),
        };
      }

      if (type === 'focus') {
        const outline = composite(parseColor(style.outlineColor), parentBackground);
        return {
          name,
          selector,
          ratio: Math.min(
            contrastRatio(outline, parentBackground),
            contrastRatio(outline, elementBackground),
          ),
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
        };
      }

      const foreground = composite(parseColor(style.color), elementBackground);
      return {
        name,
        selector,
        ratio: contrastRatio(foreground, elementBackground),
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: Number.parseFloat(style.fontWeight),
      };
    });
  }, targets);
}

function expectContrast(results, minimum) {
  for (const result of results) {
    expect(result.missing, `${result.name} should be rendered`).not.toBe(true);
    expect(result.ratio, `${result.name} contrast`).toBeGreaterThanOrEqual(minimum);
  }
}

test('keeps route results and metadata readable', async ({ page }) => {
  await page.goto(SEARCH_ROUTE);

  const results = await readContrast(page, [
    { name: 'departure archive label', selector: '.departure-archive summary' },
    { name: 'line badge', selector: '.departure-card .line-badge' },
    { name: 'duration chip', selector: '.departure-meta > span' },
    { name: 'route summary line', selector: '.summary-lines' },
  ]);

  expectContrast(results, 4.5);
});

test('keeps interactive boundaries and focus visible', async ({ page }) => {
  await page.goto('/');

  expectContrast(await readContrast(page, [
    { name: 'pending step label', selector: '.route-progress-step--pending strong' },
    { name: 'pending step helper', selector: '.route-progress-step--pending small' },
  ]), 4.5);

  const initialControlStyles = await page.evaluate(() => ({
    pendingOpacity: Number.parseFloat(getComputedStyle(
      document.querySelector('.route-progress-step--pending'),
    ).opacity),
    selectAppearance: getComputedStyle(document.querySelector('[name="dayType"]')).appearance,
  }));

  expect(initialControlStyles.pendingOpacity).toBe(1);
  expect(initialControlStyles.selectAppearance).not.toBe('none');

  const boundaries = await readContrast(page, [
    { name: 'origin input boundary', selector: '[name="from"]', type: 'border' },
    { name: 'service day boundary', selector: '[name="dayType"]', type: 'border' },
    { name: 'primary navigation boundary', selector: '.app-tab', type: 'border' },
    { name: 'topbar action boundary', selector: '.topbar-link', type: 'border' },
  ]);

  for (const boundary of boundaries) {
    expect(boundary.missing, `${boundary.name} should be rendered`).not.toBe(true);
    expect(boundary.borderStyle, `${boundary.name} border style`).not.toBe('none');
    expect(boundary.borderWidth, `${boundary.name} border width`).toBeGreaterThanOrEqual(1);
    expect(boundary.ratio, `${boundary.name} border contrast`).toBeGreaterThanOrEqual(3);
  }

  const activeTab = page.locator('.app-tab[aria-current="page"]');
  await activeTab.focus();

  const focus = await readContrast(page, [
    { name: 'active tab focus ring', selector: '.app-tab[aria-current="page"]', type: 'focus' },
  ]);

  expect(focus[0].outlineStyle).not.toBe('none');
  expect(focus[0].outlineWidth).toBeGreaterThanOrEqual(3);
  expectContrast(focus, 3);
});

test('keeps saved and browse views readable with real content', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('riviera:saved-routes', JSON.stringify({
      favorites: [{
        identity: 'sanremo-autostazione|ventimiglia-centro|feriale',
        fromInput: 'Sanremo Autostazione',
        fromStopId: 'sanremo-autostazione',
        toInput: 'VENTIMIGLIA Centro',
        toStopId: 'ventimiglia-centro',
        dayType: 'feriale',
        resultCount: 87,
      }],
      recents: [],
    }));
  });

  await page.goto('/?tab=saved');
  await expect(page.locator('.saved-view h2')).toBeVisible();
  expectContrast(await readContrast(page, [
    { name: 'saved heading', selector: '.saved-view h2' },
    { name: 'saved subtitle', selector: '.saved-view > div > p:last-child' },
    { name: 'saved route name', selector: '.saved-route-main strong' },
    { name: 'saved route metadata', selector: '.saved-route-main span' },
  ]), 4.5);
  expectContrast(await readContrast(page, [
    { name: 'saved route boundary', selector: '.saved-route-main', type: 'border' },
  ]), 3);

  await page.goto('/?tab=browse');
  await expect(page.locator('.browse-view h2')).toBeVisible();
  expectContrast(await readContrast(page, [
    { name: 'browse heading', selector: '.browse-view h2' },
    { name: 'browse subtitle', selector: '.browse-view > div > p:last-child' },
    { name: 'browse count', selector: '.browse-count' },
    { name: 'browse row metadata', selector: '.browse-row-copy small' },
  ]), 4.5);
  expectContrast(await readContrast(page, [
    { name: 'browse filter boundary', selector: '.browse-filter input', type: 'border' },
    { name: 'browse row boundary', selector: '.browse-list button', type: 'border' },
  ]), 3);
});

test('keeps share, SEO, and offline surfaces readable', async ({ page }) => {
  await page.goto(SEARCH_ROUTE);
  await page.getByRole('button', { name: 'Condividi', exact: true }).click();

  expectContrast(await readContrast(page, [
    { name: 'share heading', selector: '.share-modal h3' },
    { name: 'share description', selector: '.share-modal-head p:not(.eyebrow)' },
    { name: 'share option', selector: '.share-option' },
  ]), 4.5);
  await page.locator('.share-link-field input').focus();
  expectContrast(await readContrast(page, [
    { name: 'share field boundary', selector: '.share-link-field input', type: 'border' },
    { name: 'share option boundary', selector: '.share-option', type: 'border' },
    { name: 'share close boundary', selector: '.share-modal-close', type: 'border' },
  ]), 3);

  await page.goto('/routes/sanremo/ventimiglia/');
  await page.addStyleTag({ path: 'styles.css' });
  expectContrast(await readContrast(page, [
    { name: 'SEO heading', selector: '.seo-page h1' },
    { name: 'SEO body copy', selector: '.seo-page p' },
    { name: 'SEO secondary action', selector: '.seo-page .button.secondary' },
    { name: 'SEO timetable cell', selector: '.seo-page td' },
  ]), 4.5);

  await page.goto('/offline.html');
  expectContrast(await readContrast(page, [
    { name: 'offline heading', selector: '.empty-state h1' },
    { name: 'offline message', selector: '.empty-state p:last-of-type' },
    { name: 'offline action', selector: '.topbar-link' },
  ]), 4.5);
});

test('honors the explicit light contract under dark and forced-color preferences', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme))
    .toContain('light');

  expectContrast(await readContrast(page, [
    { name: 'dark-preference heading', selector: '.search-form-intro h1' },
    { name: 'dark-preference helper text', selector: '.search-form-intro p' },
  ]), 4.5);

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.reload();
  const activeTab = page.locator('.app-tab[aria-current="page"]');
  await activeTab.focus();

  const forcedColorFocus = await activeTab.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(forcedColorFocus.outlineStyle).not.toBe('none');
  expect(forcedColorFocus.outlineWidth).toBeGreaterThanOrEqual(3);
});
