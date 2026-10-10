import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deploy workflow', () => {
  it('runs unit and browser gates before uploading the Pages artifact', async () => {
    const workflow = await readFile(path.join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8');

    const unitTestIndex = workflow.indexOf('run: npm test');
    const buildDataIndex = workflow.indexOf('run: npm run build:data');
    const buildSeoIndex = workflow.indexOf('run: npm run build:seo');
    const browserInstallIndex = workflow.indexOf('run: npx playwright install --with-deps chromium');
    const browserTestIndex = workflow.indexOf('run: npm run test:smoke');
    const uploadIndex = workflow.indexOf('uses: actions/upload-pages-artifact@v3');

    expect(unitTestIndex).toBeGreaterThan(-1);
    expect(buildDataIndex).toBeGreaterThan(unitTestIndex);
    expect(buildDataIndex).toBeGreaterThan(-1);
    expect(buildSeoIndex).toBeGreaterThan(buildDataIndex);
    expect(browserInstallIndex).toBeGreaterThan(buildSeoIndex);
    expect(browserTestIndex).toBeGreaterThan(browserInstallIndex);
    expect(uploadIndex).toBeGreaterThan(browserTestIndex);
  });
});
