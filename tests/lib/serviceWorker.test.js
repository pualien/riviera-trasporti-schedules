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
  it('uses a cache version aligned with the versioned app shell assets', () => {
    const source = fs.readFileSync('service-worker.js', 'utf8');

    expect(source).toContain("const CACHE_NAME = `${CACHE_PREFIX}v12`;");
  });

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

  it('keeps timetable data out of the install-time cache payload', async () => {
    const cachedUrls = [];
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async (url) => {
            cachedUrls.push(url);
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

    expect(cachedUrls).not.toContain('./assets/data/trips.json');
    expect(cachedUrls).not.toContain('./assets/data/stops.json');
    expect(cachedUrls).not.toContain('./assets/data/stop-coordinates.json');
    expect(cachedUrls).not.toContain('./assets/data/localities.json');
    expect(cachedUrls).not.toContain('./assets/data/reachability.json');
    expect(cachedUrls).not.toContain('./assets/data/metadata.json');
    expect(cachedUrls).toContain('./src/lib/ads.js');
    expect(cachedUrls).toContain('./src/lib/ads.js?v=12');
    expect(cachedUrls).toContain('./src/lib/installAdSense.js');
    expect(cachedUrls).toContain('./src/lib/installAdSense.js?v=12');
    expect(cachedUrls).toContain('./src/lib/providerSearch.js');
    expect(cachedUrls).toContain('./src/ui/renderAdSlot.js');
    expect(cachedUrls).toContain('./src/ui/renderLogos.js');
    expect(cachedUrls).toContain('./src/ui/renderProviderSearchView.js');
  });

  it('precaches the versioned app shell requested by index.html', async () => {
    const cachedUrls = [];
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async (url) => {
            cachedUrls.push(url);
          },
        }),
      },
      fetch: async () => {
        throw new Error('unused');
      },
      selfOverrides: {
        skipWaiting: async () => undefined,
      },
    });
    const { event, promises } = waitableEvent();

    listeners.install(event);
    await expect(promises[0]).resolves.toBeUndefined();

    expect(cachedUrls).toContain('./styles.css?v=12');
    expect(cachedUrls).toContain('./src/main.js?v=12');
    expect(cachedUrls).toContain('./src/lib/analytics.js?v=12');
    expect(cachedUrls).toContain('./src/ui/renderSearchForm.js?v=12');
    expect(cachedUrls).toContain('./src/lib/pwaController.js');
    expect(cachedUrls).toContain('./src/ui/renderPwaControl.js');
    expect(cachedUrls).toContain('./offline.html');
  });

  it('activates a waiting update when messaged by the page', async () => {
    let skipWaitingCalled = false;
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async () => undefined,
        }),
      },
      fetch: async () => {
        throw new Error('unused');
      },
      selfOverrides: {
        skipWaiting: async () => {
          skipWaitingCalled = true;
        },
      },
    });

    listeners.message({ data: { type: 'SKIP_WAITING' } });

    expect(skipWaitingCalled).toBe(true);
  });

  it('caches a same-origin page requested by a controlled SEO page', async () => {
    const putCalls = [];
    const fetchCalls = [];
    const networkResponse = {
      ok: true,
      type: 'basic',
      clone: () => ({ ok: true, type: 'basic' }),
    };
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async () => undefined,
          put: async (request, response) => {
            putCalls.push({ request, response });
          },
        }),
      },
      fetch: async (request) => {
        fetchCalls.push(String(request));
        return networkResponse;
      },
    });
    const promises = [];

    listeners.message({
      data: { type: 'CACHE_URL', url: 'http://localhost/routes/sanremo/ventimiglia/' },
      waitUntil(promise) {
        promises.push(promise);
      },
    });
    await expect(promises[0]).resolves.toBeUndefined();

    expect(fetchCalls).toEqual(['http://localhost/routes/sanremo/ventimiglia/']);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].request).toBe('http://localhost/routes/sanremo/ventimiglia/');
  });

  it('ignores cross-origin page cache requests from messages', async () => {
    const listeners = loadServiceWorker({
      caches: {
        open: async () => ({
          add: async () => undefined,
          put: async () => {
            throw new Error('should not cache cross-origin URLs');
          },
        }),
      },
      fetch: async () => {
        throw new Error('should not fetch cross-origin URLs');
      },
    });
    const promises = [];

    listeners.message({
      data: { type: 'CACHE_URL', url: 'https://example.com/routes/sanremo/ventimiglia/' },
      waitUntil(promise) {
        promises.push(promise);
      },
    });

    expect(promises).toEqual([]);
  });

  it('deletes only old caches owned by this app', async () => {
    const deleted = [];
    const listeners = loadServiceWorker({
      caches: {
        keys: async () => [
          'riviera-dei-fiori-route-finder-v0',
          'riviera-dei-fiori-route-finder-v1',
          'riviera-dei-fiori-route-finder-v2',
          'riviera-dei-fiori-route-finder-v3',
          'riviera-dei-fiori-route-finder-v4',
          'riviera-dei-fiori-route-finder-v5',
          'riviera-dei-fiori-route-finder-v6',
          'riviera-dei-fiori-route-finder-v7',
          'riviera-dei-fiori-route-finder-v8',
          'riviera-dei-fiori-route-finder-v9',
          'riviera-dei-fiori-route-finder-v10',
          'riviera-dei-fiori-route-finder-v11',
          'azzuriva-route-tools-v6',
          'riviera-route-tools-v6',
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
      'riviera-dei-fiori-route-finder-v0',
      'riviera-dei-fiori-route-finder-v1',
      'riviera-dei-fiori-route-finder-v2',
      'riviera-dei-fiori-route-finder-v3',
      'riviera-dei-fiori-route-finder-v4',
      'riviera-dei-fiori-route-finder-v5',
      'riviera-dei-fiori-route-finder-v6',
      'riviera-dei-fiori-route-finder-v7',
      'riviera-dei-fiori-route-finder-v8',
      'riviera-dei-fiori-route-finder-v9',
      'riviera-dei-fiori-route-finder-v10',
      'riviera-dei-fiori-route-finder-v11',
      'azzuriva-route-tools-v6',
      'riviera-route-tools-v6',
    ]);
  });

  it('warms timetable data before claiming clients on activation', async () => {
    const fetchedUrls = [];
    let clientsClaimed = false;
    const listeners = loadServiceWorker({
      caches: {
        keys: async () => [],
        delete: async () => true,
        open: async () => ({
          put: async () => undefined,
        }),
      },
      fetch: async (url) => {
        fetchedUrls.push(String(url));
        return {
          ok: true,
          type: 'basic',
          clone: () => ({ ok: true, type: 'basic' }),
        };
      },
      selfOverrides: {
        clients: {
          claim: async () => {
            clientsClaimed = true;
          },
        },
      },
    });
    const { event, promises } = waitableEvent();

    listeners.activate(event);
    await promises[0];

    expect(fetchedUrls).toEqual([
      'http://localhost/assets/data/trips.json',
      'http://localhost/assets/data/stops.json',
      'http://localhost/assets/data/stop-coordinates.json',
      'http://localhost/assets/data/localities.json',
      'http://localhost/assets/data/reachability.json',
      'http://localhost/assets/data/metadata.json',
      'http://localhost/assets/data/data-quality.json',
      'http://localhost/data/manual/localities.json',
    ]);
    expect(clientsClaimed).toBe(true);
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

  it('returns the offline fallback when a navigation request fails without a cached page', async () => {
    const fallbackResponse = { name: 'offline fallback' };
    const listeners = loadServiceWorker({
      caches: {
        match: async (request) => (request === './offline.html' ? fallbackResponse : null),
        open: async () => ({
          put: async () => undefined,
        }),
      },
      fetch: async () => {
        throw new Error('offline');
      },
    });
    const respondWithPromises = [];

    listeners.fetch({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'http://localhost/routes/sanremo/ventimiglia/',
      },
      respondWith(promise) {
        respondWithPromises.push(promise);
      },
    });

    await expect(respondWithPromises[0]).resolves.toBe(fallbackResponse);
  });

  it('returns the app shell before the offline fallback for failed root app navigations', async () => {
    const appShellResponse = { name: 'app shell' };
    const fallbackResponse = { name: 'offline fallback' };
    const listeners = loadServiceWorker({
      caches: {
        match: async (request) => {
          if (request === './index.html') {
            return appShellResponse;
          }

          if (request === './offline.html') {
            return fallbackResponse;
          }

          return null;
        },
        open: async () => ({
          put: async () => undefined,
        }),
      },
      fetch: async () => {
        throw new Error('offline');
      },
    });
    const respondWithPromises = [];

    listeners.fetch({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'http://localhost/?tab=search',
      },
      respondWith(promise) {
        respondWithPromises.push(promise);
      },
    });

    await expect(respondWithPromises[0]).resolves.toBe(appShellResponse);
  });
});
