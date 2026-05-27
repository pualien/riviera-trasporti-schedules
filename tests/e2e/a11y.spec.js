import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
});

test('passes baseline accessibility checks for the initial app shell', async ({ page }) => {
  await page.goto('/');

  const issues = await page.evaluate(() => {
    const results = [];
    const ids = new Set();
    const duplicatedIds = new Set();

    for (const element of document.querySelectorAll('[id]')) {
      if (ids.has(element.id)) {
        duplicatedIds.add(element.id);
      }
      ids.add(element.id);
    }

    for (const id of duplicatedIds) {
      results.push(`Duplicate id: ${id}`);
    }

    for (const control of document.querySelectorAll('input, select, textarea')) {
      const hasProgrammaticName = Boolean(
        control.getAttribute('aria-label')
          || control.getAttribute('aria-labelledby')
          || control.closest('label'),
      );

      if (!hasProgrammaticName) {
        results.push(`Unnamed form control: ${control.outerHTML}`);
      }
    }

    for (const link of document.querySelectorAll('a[href]')) {
      if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
        results.push(`Unnamed link: ${link.outerHTML}`);
      }
    }

    for (const button of document.querySelectorAll('button')) {
      if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
        results.push(`Unnamed button: ${button.outerHTML}`);
      }
    }

    if (!document.querySelector('h1')) {
      results.push('Missing h1');
    }

    if (!document.querySelector('meta[name="viewport"]')) {
      results.push('Missing responsive viewport meta tag');
    }

    return results;
  });

  expect(issues).toEqual([]);

  await page.keyboard.press('Tab');
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(focusedTag).not.toBe('BODY');
});
