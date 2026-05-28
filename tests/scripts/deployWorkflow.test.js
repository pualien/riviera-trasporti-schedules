import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deploy workflow', () => {
  it('builds SEO pages after data assets and before uploading the Pages artifact', async () => {
    const workflow = await readFile(path.join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8');

    const buildDataIndex = workflow.indexOf('run: npm run build:data');
    const buildSeoIndex = workflow.indexOf('run: npm run build:seo');
    const uploadIndex = workflow.indexOf('uses: actions/upload-pages-artifact@v3');

    expect(buildDataIndex).toBeGreaterThan(-1);
    expect(buildSeoIndex).toBeGreaterThan(buildDataIndex);
    expect(uploadIndex).toBeGreaterThan(buildSeoIndex);
  });
});
