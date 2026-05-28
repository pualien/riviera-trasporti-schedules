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
    Number.parseFloat(getComputedStyle(element).letterSpacing)
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
