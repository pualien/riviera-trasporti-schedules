import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

function readManifest() {
  return JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
}

describe('manifest.webmanifest', () => {
  it('contains install identity, shortcuts, and screenshot assets', () => {
    const manifest = readManifest();

    expect(manifest.id).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.shortcuts).toEqual([
      expect.objectContaining({
        name: 'Search',
        url: './?tab=search',
      }),
      expect.objectContaining({
        name: 'Browse',
        url: './?tab=browse',
      }),
      expect.objectContaining({
        name: 'Saved',
        url: './?tab=saved',
      }),
    ]);
    expect(manifest.screenshots).toEqual([
      expect.objectContaining({
        src: './assets/brand/pwa-screenshot-desktop.png',
        sizes: '1280x720',
        form_factor: 'wide',
      }),
      expect.objectContaining({
        src: './assets/brand/pwa-screenshot-mobile.png',
        sizes: '390x844',
        form_factor: 'narrow',
      }),
    ]);

    for (const screenshot of manifest.screenshots) {
      expect(fs.existsSync(screenshot.src.replace('./', ''))).toBe(true);
    }
  });
});
