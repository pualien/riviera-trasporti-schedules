import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../src/lib/registerServiceWorker.js';

describe('registerServiceWorker', () => {
  it('registers the app service worker when supported', async () => {
    const register = vi.fn().mockResolvedValue({});
    const navigatorObject = {
      serviceWorker: { register },
    };

    await expect(registerServiceWorker(navigatorObject)).resolves.toBe(true);

    expect(register).toHaveBeenCalledWith('./service-worker.js');
  });

  it('returns false when service workers are unsupported', async () => {
    await expect(registerServiceWorker({})).resolves.toBe(false);
  });

  it('returns false and logs registration failures', async () => {
    const error = new Error('registration failed');
    const register = vi.fn().mockRejectedValue(error);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(registerServiceWorker({ serviceWorker: { register } })).resolves.toBe(false);

    expect(consoleError).toHaveBeenCalledWith('Service worker registration failed', error);

    consoleError.mockRestore();
  });
});
