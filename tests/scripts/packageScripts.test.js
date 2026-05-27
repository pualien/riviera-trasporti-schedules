import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('package scripts', () => {
  it('exposes browser, e2e, accessibility, and smoke test entry points', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:browser': 'playwright test',
      'test:e2e': 'playwright test tests/e2e/app-flow.spec.js',
      'test:a11y': 'playwright test tests/e2e/a11y.spec.js',
      'test:smoke': 'playwright test tests/e2e',
    });
  });

  it('pins the browser smoke test runner as a project dev dependency', () => {
    expect(packageJson.devDependencies).toHaveProperty('@playwright/test');
  });
});
