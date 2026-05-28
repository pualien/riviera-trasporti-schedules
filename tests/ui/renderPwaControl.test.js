import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderPwaControl } from '../../src/ui/renderPwaControl.js';

describe('renderPwaControl', () => {
  it('renders nothing when no PWA action or status is visible', () => {
    const html = renderPwaControl({
      pwaState: {
        pwaSupported: true,
        installAvailable: false,
        isOnline: true,
        updateAvailable: false,
      },
      t: createTranslator('en'),
    });

    expect(html).toBe('');
  });

  it('renders an install action when installation is available', () => {
    const html = renderPwaControl({
      pwaState: {
        pwaSupported: true,
        installAvailable: true,
        isOnline: true,
        updateAvailable: false,
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('data-pwa-control');
    expect(html).toContain('data-pwa-install');
    expect(html).toContain('Install app');
  });

  it('renders an offline status when the browser is offline', () => {
    const html = renderPwaControl({
      pwaState: {
        pwaSupported: true,
        installAvailable: false,
        isOnline: false,
        updateAvailable: false,
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('pwa-control--offline');
    expect(html).toContain('Offline');
    expect(html).toContain('Cached timetable data stays available.');
  });

  it('renders an update action when a refresh is available', () => {
    const html = renderPwaControl({
      pwaState: {
        pwaSupported: true,
        installAvailable: false,
        isOnline: true,
        updateAvailable: true,
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('data-pwa-update');
    expect(html).toContain('Update');
  });
});
