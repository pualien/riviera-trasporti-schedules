import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadServiceWorker({ caches, fetch }) {
  const listeners = {};
  const self = {
    location: { origin: 'http://localhost' },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
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

  it('deletes only old caches owned by this app', async () => {
    const deleted = [];
    const listeners = loadServiceWorker({
      caches: {
        keys: async () => [
          'riviera-route-tools-v0',
          'riviera-route-tools-v1',
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

    expect(deleted).toEqual(['riviera-route-tools-v0']);
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
