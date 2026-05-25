import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PUBLISHED_DATA_ASSETS = [
  { path: '../../assets/data/metadata.json', expectedType: 'object' },
  { path: '../../assets/data/localities.json', expectedType: 'array' },
  { path: '../../assets/data/reachability.json', expectedType: 'object' },
  { path: '../../assets/data/stop-coordinates.json', expectedType: 'object' },
];

describe('published data assets', () => {
  it('keeps every optional production JSON sidecar present and parseable', async () => {
    for (const asset of PUBLISHED_DATA_ASSETS) {
      const raw = await readFile(new URL(asset.path, import.meta.url), 'utf8');
      const parsed = JSON.parse(raw);

      if (asset.expectedType === 'array') {
        expect(Array.isArray(parsed), asset.path).toBe(true);
        continue;
      }

      expect(parsed, asset.path).not.toBeNull();
      expect(Array.isArray(parsed), asset.path).toBe(false);
      expect(typeof parsed, asset.path).toBe(asset.expectedType);
    }
  });
});
