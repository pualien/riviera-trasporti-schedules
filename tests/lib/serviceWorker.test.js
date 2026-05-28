import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadServiceWorker({ caches, fetch, selfOverrides = {} }) {
  const listeners = {};
  const self = {
    location: { origin: 'http://localhost' },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    ...selfOverrides,
  };

  vm.runInNewContext(
    fs.readFileSync('service-worker.js', 'utf8'),
    {
      caches,
      fetch,
      self,
      URL,
    },
  );

  return listeners;
}

function waitableEvent() {
  const promises = [];

  return {
    event: {
      waitUntil(promise) {
        promises.push(promise);
      },
    },
    promises,
  };
}

describe('service worker', () => {
  it('fails install when a required app-shell asset cannot be cached', async () => {
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async (url) => {
            if (url === './src/main.js') {
              throw new Error('missing required asset');
            }
          },
        }),
      },
      fetch: async () => {
        throw new Error('unused');
      },
    });
    const { event, promises } = waitableEvent();

    listeners.install(event);

    await expect(promises[0]).rejects.toThrow('missing required asset');
  });

  it('treats stop coordinates as optional cached data', async () => {
    const cachedUrls = [];
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async (url) => {
            cachedUrls.push(url);
            if (url === './assets/data/stop-coordinates.json') {
              throw new Error('coordinates unavailable');
            }
          },
        }),
      },
      fetch: async () => {
        throw new Error('unused');
      },
    });
    const { event, promises } = waitableEvent();

    listeners.install(event);
    await expect(promises[0]).resolves.toBeUndefined();

    expect(cachedUrls).toContain('./assets/data/stop-coordinates.json');
    expect(cachedUrls).toContain('./src/lib/ads.js');
    expect(cachedUrls).toContain('./src/lib/installAdSense.js');
    expect(cachedUrls).toContain('./src/lib/providerSearch.js');
    expect(cachedUrls).toContain('./src/ui/renderAdSlot.js');
    expect(cachedUrls).toContain('./src/ui/renderLogos.js');
    expect(cachedUrls).toContain('./src/ui/renderProviderSearchView.js');
  });

  it('deletes only old caches owned by this app', async () => {
    const deleted = [];
    const listeners = loadServiceWorker({
      caches: {
        keys: async () => [
          'azzuriva-route-tools-v0',
          'azzuriva-route-tools-v1',
          'azzuriva-route-tools-v2',
          'azzuriva-route-tools-v3',
          'azzuriva-route-tools-v4',
          'azzuriva-route-tools-v5',
          'azzuriva-route-tools-v6',
          'other-static-app',
        ],
        delete: async (cacheName) => {
          deleted.push(cacheName);
          return true;
        },
      },
      fetch: async () => {
        throw new Error('unused');
      },
    });
    const { event, promises } = waitableEvent();

    listeners.activate(event);
    await promises[0];

    expect(deleted).toEqual([
      'azzuriva-route-tools-v0',
      'azzuriva-route-tools-v1',
      'azzuriva-route-tools-v2',
      'azzuriva-route-tools-v3',
      'azzuriva-route-tools-v4',
      'azzuriva-route-tools-v5',
    ]);
  });

  it('activates a refreshed app cache without waiting for old clients to close', async () => {
    let skipWaitingCalled = false;
    let clientsClaimed = false;
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async () => undefined,
        }),
        keys: async () => [],
        delete: async () => true,
      },
      fetch: async () => {
        throw new Error('unused');
      },
      selfOverrides: {
        skipWaiting: async () => {
          skipWaitingCalled = true;
        },
        clients: {
          claim: async () => {
            clientsClaimed = true;
          },
        },
      },
    });
    const install = waitableEvent();
    const activate = waitableEvent();

    listeners.install(install.event);
    await install.promises[0];

    listeners.activate(activate.event);
    await activate.promises[0];

    expect(skipWaitingCalled).toBe(true);
    expect(clientsClaimed).toBe(true);
  });

  it('returns a network response when best-effort runtime caching fails', async () => {
    const networkResponse = {
      ok: true,
      type: 'basic',
      clone: () => ({ ok: true, type: 'basic' }),
    };
    const listeners = loadServiceWorker({
      caches: {
        match: async () => null,
        open: async () => ({
          put: async () => {
            throw new Error('quota exceeded');
          },
        }),
      },
      fetch: async () => networkResponse,
    });
    const respondWithPromises = [];

    listeners.fetch({
      request: new Request('http://localhost/assets/data/trips.json'),
      respondWith(promise) {
        respondWithPromises.push(promise);
      },
    });

    await expect(respondWithPromises[0]).resolves.toBe(networkResponse);
  });
});
