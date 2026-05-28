# Full PWA UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Azzuriva into a visible, installable, offline-aware PWA with install, offline, update, SEO-page, and manifest screenshot support.

**Architecture:** Keep the app static and vanilla JavaScript. Add a focused PWA controller for browser/service-worker lifecycle behavior, a small renderer for shell controls, and service-worker changes for update activation, offline fallback, and visited-page caching. Generated SEO pages receive PWA metadata and a lightweight registration script without adopting the full SPA shell.

**Tech Stack:** Vanilla ES modules, Vitest, Playwright, static GitHub Pages assets, Service Worker Cache API, Web App Manifest.

---

## File Structure

- Create `offline.html`: static branded fallback used for failed offline navigations.
- Modify `service-worker.js`: cache versioned shell assets, handle `SKIP_WAITING`, handle `CACHE_URL`, and serve offline fallback.
- Modify `tests/lib/serviceWorker.test.js`: unit coverage for service-worker cache, update, visited-page caching, and fallback behavior.
- Create `src/lib/pwaController.js`: browser-facing PWA lifecycle controller.
- Create `tests/lib/pwaController.test.js`: unit coverage for install prompt, online/offline, registration, and update activation.
- Create `src/ui/renderPwaControl.js`: render install/offline/update controls.
- Create `tests/ui/renderPwaControl.test.js`: renderer coverage for each visible state.
- Modify `src/ui/renderShell.js`: accept and place PWA control markup in the topbar.
- Modify `tests/ui/renderShell.test.js`: verify PWA control placement.
- Modify `src/lib/i18n.js`: add short PWA labels for supported languages.
- Modify `src/main.js`: initialize the PWA controller, render PWA controls, and bind install/update actions.
- Modify `styles.css`: style the compact PWA utility control.
- Modify `scripts/lib/renderSeoPageHtml.mjs`: render PWA head tags and SEO-page service-worker registration/cache script.
- Modify `tests/scripts/renderSeoPageHtml.test.js`: verify generated SEO PWA markup.
- Modify `manifest.webmanifest`: add `id`, shortcuts, categories, and screenshot metadata.
- Create `assets/brand/pwa-screenshot-desktop.png`: desktop install screenshot generated from the app.
- Create `assets/brand/pwa-screenshot-mobile.png`: mobile install screenshot generated from the app.
- Create `tests/lib/manifest.test.js`: verify manifest install metadata and screenshot files.
- Create `tests/e2e/pwa.spec.js`: browser-level offline and SEO-page cache verification.

---

### Task 1: Service Worker Offline And Update Behavior

**Files:**
- Create: `offline.html`
- Modify: `service-worker.js`
- Modify: `tests/lib/serviceWorker.test.js`

- [ ] **Step 1: Write failing service-worker tests**

Add these tests inside the existing `describe('service worker', () => { ... })` block in `tests/lib/serviceWorker.test.js`:

```js
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

    expect(cachedUrls).toContain('./styles.css?v=6');
    expect(cachedUrls).toContain('./src/main.js?v=6');
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
```

Update the existing `deletes only old caches owned by this app` test so it uses the new cache version. Change the cache list and expected deleted list to:

```js
        keys: async () => [
          'azzuriva-route-tools-v0',
          'azzuriva-route-tools-v1',
          'azzuriva-route-tools-v2',
          'azzuriva-route-tools-v3',
          'azzuriva-route-tools-v4',
          'azzuriva-route-tools-v5',
          'azzuriva-route-tools-v6',
          'azzuriva-route-tools-v7',
          'other-static-app',
        ],
```

```js
    expect(deleted).toEqual([
      'azzuriva-route-tools-v0',
      'azzuriva-route-tools-v1',
      'azzuriva-route-tools-v2',
      'azzuriva-route-tools-v3',
      'azzuriva-route-tools-v4',
      'azzuriva-route-tools-v5',
      'azzuriva-route-tools-v6',
    ]);
```

- [ ] **Step 2: Run service-worker tests to verify they fail**

Run:

```bash
rtk npm test -- tests/lib/serviceWorker.test.js
```

Expected: FAIL because `service-worker.js` does not cache `./styles.css?v=6`, does not cache `./src/main.js?v=6`, does not include `./offline.html`, does not register a `message` listener, and still falls back directly to `./index.html`.

- [ ] **Step 3: Add the offline fallback page**

Create `offline.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Azzuriva offline</title>
    <meta
      name="description"
      content="Azzuriva is offline. Reopen the app after a previous online load to use cached route data."
    />
    <meta name="theme-color" content="#eb4c60" />
    <link rel="icon" type="image/png" sizes="32x32" href="./assets/brand/favicon-32x32.png" />
    <link rel="apple-touch-icon" href="./assets/brand/apple-touch-icon.png" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="stylesheet" href="./styles.css?v=6" />
  </head>
  <body>
    <main class="app-shell" id="app">
      <section class="empty-state">
        <p class="eyebrow">Offline</p>
        <h1>Azzuriva is offline</h1>
        <p>Previously loaded timetable data can still work in the app. Live maps and nearby-stop lookup need a connection.</p>
        <a class="topbar-link" href="./">Open the app</a>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Replace the service-worker implementation**

Replace `service-worker.js` with:

```js
const CACHE_PREFIX = 'azzuriva-route-tools-';
const LEGACY_CACHE_PREFIX = 'riviera-route-tools-';
const CACHE_NAME = `${CACHE_PREFIX}v7`;

const REQUIRED_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './styles.css?v=6',
  './manifest.webmanifest',
  './assets/brand/apple-touch-icon.png',
  './assets/brand/favicon-16x16.png',
  './assets/brand/favicon-32x32.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png',
  './assets/data/trips.json',
  './assets/data/stops.json',
  './src/main.js',
  './src/main.js?v=6',
  './src/lib/analytics.js',
  './src/lib/ads.js',
  './src/lib/appBootstrap.js',
  './src/lib/brand.js',
  './src/lib/browseIndex.js',
  './src/lib/fromSuggestions.js',
  './src/lib/i18n.js',
  './src/lib/leafletLoader.js',
  './src/lib/localities.js',
  './src/lib/nearbyStops.js',
  './src/lib/normalize.js',
  './src/lib/provinceLookup.js',
  './src/lib/providerSearch.js',
  './src/lib/query.js',
  './src/lib/installAdSense.js',
  './src/lib/registerServiceWorker.js',
  './src/lib/routeMap.js',
  './src/lib/routePickerState.js',
  './src/lib/routeTaxiOptions.js',
  './src/lib/routeUrlState.js',
  './src/lib/savedRoutes.js',
  './src/lib/searchOutcome.js',
  './src/lib/seo.js',
  './src/lib/serviceDay.js',
  './src/lib/taxiDirectory.js',
  './src/lib/textInputSelection.js',
  './src/lib/time.js',
  './src/lib/transferSuggestions.js',
  './src/lib/shareRoute.js',
  './src/ui/renderAdSlot.js',
  './src/ui/renderBrowseView.js',
  './src/ui/renderEmptyState.js',
  './src/ui/renderLocationPicker.js',
  './src/ui/renderLogos.js',
  './src/ui/renderNoDirectFallback.js',
  './src/ui/renderProviderSearchView.js',
  './src/ui/renderResults.js',
  './src/ui/renderRouteMapPanel.js',
  './src/ui/renderSavedView.js',
  './src/ui/renderSearchForm.js',
  './src/ui/renderShell.js',
  './src/ui/renderTabNav.js',
  './src/ui/renderTaxiOption.js',
  './src/ui/renderTransferSuggestions.js',
];

const OPTIONAL_ASSETS = [
  './assets/data/lines.json',
  './assets/data/metadata.json',
  './assets/data/localities.json',
  './assets/data/reachability.json',
  './assets/data/stop-coordinates.json',
  './data/manual/localities.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      [
        ...REQUIRED_ASSETS.map((url) => cache.add(url)),
        ...OPTIONAL_ASSETS.map((url) => cache.add(url).catch(() => null)),
      ],
    ).then(() => self.skipWaiting?.())),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => (
          (cacheName.startsWith(CACHE_PREFIX) || cacheName.startsWith(LEGACY_CACHE_PREFIX))
          && cacheName !== CACHE_NAME
        ))
        .map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients?.claim?.()),
  );
});

async function cacheResponse(request, response) {
  if (!response.ok || response.type !== 'basic') {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  try {
    await cache.put(request, response.clone());
  } catch (error) {
    // Runtime caching is best-effort; a quota miss should not break navigation.
  }
}

async function cacheSameOriginUrl(urlValue) {
  const url = new URL(urlValue, self.location.origin);

  if (url.origin !== self.location.origin) {
    return;
  }

  const response = await fetch(url.href);
  await cacheResponse(url.href, response);
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting?.();
    return;
  }

  if (event.data?.type === 'CACHE_URL' && event.data.url) {
    try {
      const url = new URL(event.data.url, self.location.origin);

      if (url.origin === self.location.origin) {
        event.waitUntil(cacheSameOriginUrl(url.href));
      }
    } catch (error) {
      // Ignore malformed cache warm-up messages.
    }
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      await cacheResponse(request, networkResponse);
      return networkResponse;
    } catch (error) {
      if (request.mode === 'navigate') {
        const offlineFallback = await caches.match('./offline.html');
        if (offlineFallback) {
          return offlineFallback;
        }

        const appShell = await caches.match('./index.html');
        if (appShell) {
          return appShell;
        }
      }

      throw error;
    }
  })());
});
```

- [ ] **Step 5: Run service-worker tests to verify they pass**

Run:

```bash
rtk npm test -- tests/lib/serviceWorker.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit service-worker behavior**

Run:

```bash
rtk git add offline.html service-worker.js tests/lib/serviceWorker.test.js
rtk git commit -m "feat: add pwa offline fallback"
```

Expected: commit succeeds.

---

### Task 2: PWA Controller

**Files:**
- Create: `src/lib/pwaController.js`
- Create: `tests/lib/pwaController.test.js`

- [ ] **Step 1: Write failing PWA controller tests**

Create `tests/lib/pwaController.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createPwaController } from '../../src/lib/pwaController.js';

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    dispatch(type, event = {}) {
      listeners.get(type)?.(event);
    },
  };
}

function createWindow({ online = true, standalone = false } = {}) {
  const target = createEventTarget();

  return {
    ...target,
    navigator: { onLine: online, standalone: false },
    matchMedia: () => ({ matches: standalone }),
    location: { reload: vi.fn() },
  };
}

describe('createPwaController', () => {
  it('captures beforeinstallprompt and prompts only after user action', async () => {
    const win = createWindow();
    const changes = [];
    const promptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: { register: vi.fn() },
      },
      onStateChange: (state) => changes.push(state),
    });

    win.dispatch('beforeinstallprompt', promptEvent);

    expect(promptEvent.preventDefault).toHaveBeenCalled();
    expect(controller.getState().installAvailable).toBe(true);
    expect(changes.at(-1)).toMatchObject({ installAvailable: true });

    await expect(controller.promptInstall()).resolves.toBe('accepted');

    expect(promptEvent.prompt).toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      installAvailable: false,
      isInstalled: true,
    });
  });

  it('tracks online and offline changes', () => {
    const win = createWindow({ online: true });
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: { register: vi.fn() },
      },
    });

    win.navigator.onLine = false;
    win.dispatch('offline');
    expect(controller.getState().isOnline).toBe(false);

    win.navigator.onLine = true;
    win.dispatch('online');
    expect(controller.getState().isOnline).toBe(true);
  });

  it('registers the service worker and reports an existing waiting update', async () => {
    const waiting = { postMessage: vi.fn() };
    const register = vi.fn().mockResolvedValue({
      waiting,
      addEventListener: vi.fn(),
    });
    const controller = createPwaController({
      windowObject: createWindow(),
      navigatorObject: {
        onLine: true,
        serviceWorker: {
          register,
          addEventListener: vi.fn(),
        },
      },
    });

    await expect(controller.register()).resolves.toBe(true);

    expect(register).toHaveBeenCalledWith('./service-worker.js');
    expect(controller.getState().updateAvailable).toBe(true);
    await expect(controller.applyUpdate()).resolves.toBe(true);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reloads once after the user applies an available update', async () => {
    const swTarget = createEventTarget();
    const win = createWindow();
    const waiting = { postMessage: vi.fn() };
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: {
          register: vi.fn().mockResolvedValue({ waiting, addEventListener: vi.fn() }),
          addEventListener: swTarget.addEventListener,
          removeEventListener: swTarget.removeEventListener,
        },
      },
    });

    await controller.register();
    await controller.applyUpdate();
    swTarget.dispatch('controllerchange');
    swTarget.dispatch('controllerchange');

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('returns false when service workers are unsupported', async () => {
    const controller = createPwaController({
      windowObject: createWindow(),
      navigatorObject: { onLine: true },
    });

    await expect(controller.register()).resolves.toBe(false);
    expect(controller.getState().pwaSupported).toBe(false);
  });
});
```

- [ ] **Step 2: Run PWA controller tests to verify they fail**

Run:

```bash
rtk npm test -- tests/lib/pwaController.test.js
```

Expected: FAIL because `src/lib/pwaController.js` does not exist.

- [ ] **Step 3: Implement the PWA controller**

Create `src/lib/pwaController.js`:

```js
function isStandalone(windowObject, navigatorObject) {
  return Boolean(
    windowObject?.matchMedia?.('(display-mode: standalone)')?.matches
    || navigatorObject?.standalone,
  );
}

function initialState(windowObject, navigatorObject) {
  return {
    pwaSupported: Boolean(navigatorObject?.serviceWorker?.register),
    installAvailable: false,
    isInstalled: isStandalone(windowObject, navigatorObject),
    isOnline: navigatorObject?.onLine !== false,
    updateAvailable: false,
  };
}

export function createPwaController({
  windowObject = globalThis.window,
  navigatorObject = globalThis.navigator,
  serviceWorkerUrl = './service-worker.js',
  onStateChange = () => {},
  logger = console,
} = {}) {
  let state = initialState(windowObject, navigatorObject);
  let deferredInstallPrompt = null;
  let registration = null;
  let reloadingForUpdate = false;
  let updateActivationRequested = false;

  function emit(patch) {
    state = { ...state, ...patch };
    onStateChange({ ...state });
  }

  function getState() {
    return { ...state };
  }

  function handleBeforeInstallPrompt(event) {
    event.preventDefault?.();
    deferredInstallPrompt = event;
    emit({ installAvailable: true });
  }

  function handleAppInstalled() {
    deferredInstallPrompt = null;
    emit({
      installAvailable: false,
      isInstalled: true,
    });
  }

  function handleOnline() {
    emit({ isOnline: true });
  }

  function handleOffline() {
    emit({ isOnline: false });
  }

  function handleControllerChange() {
    if (!updateActivationRequested || reloadingForUpdate) {
      return;
    }

    reloadingForUpdate = true;
    windowObject?.location?.reload?.();
  }

  function watchRegistration(nextRegistration) {
    registration = nextRegistration;

    if (registration?.waiting) {
      emit({ updateAvailable: true });
    }

    registration?.addEventListener?.('updatefound', () => {
      const worker = registration.installing;

      worker?.addEventListener?.('statechange', () => {
        if (worker.state === 'installed' && navigatorObject.serviceWorker?.controller) {
          emit({ updateAvailable: true });
        }
      });
    });
  }

  async function register() {
    if (!navigatorObject?.serviceWorker?.register) {
      emit({ pwaSupported: false });
      return false;
    }

    try {
      const nextRegistration = await navigatorObject.serviceWorker.register(serviceWorkerUrl);
      watchRegistration(nextRegistration);
      navigatorObject.serviceWorker.addEventListener?.('controllerchange', handleControllerChange);
      return true;
    } catch (error) {
      logger.error?.('Service worker registration failed', error);
      return false;
    }
  }

  async function promptInstall() {
    if (!deferredInstallPrompt) {
      emit({ installAvailable: false });
      return 'unavailable';
    }

    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      const accepted = choice?.outcome === 'accepted';

      emit({
        installAvailable: false,
        isInstalled: accepted || state.isInstalled,
      });

      return choice?.outcome ?? 'dismissed';
    } catch (error) {
      logger.error?.('Install prompt failed', error);
      emit({ installAvailable: false });
      return 'dismissed';
    }
  }

  async function applyUpdate() {
    if (!registration?.waiting) {
      emit({ updateAvailable: false });
      return false;
    }

    updateActivationRequested = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  function destroy() {
    windowObject?.removeEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
    windowObject?.removeEventListener?.('appinstalled', handleAppInstalled);
    windowObject?.removeEventListener?.('online', handleOnline);
    windowObject?.removeEventListener?.('offline', handleOffline);
    navigatorObject?.serviceWorker?.removeEventListener?.('controllerchange', handleControllerChange);
  }

  windowObject?.addEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
  windowObject?.addEventListener?.('appinstalled', handleAppInstalled);
  windowObject?.addEventListener?.('online', handleOnline);
  windowObject?.addEventListener?.('offline', handleOffline);

  return {
    getState,
    register,
    promptInstall,
    applyUpdate,
    destroy,
  };
}
```

- [ ] **Step 4: Run PWA controller tests to verify they pass**

Run:

```bash
rtk npm test -- tests/lib/pwaController.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit PWA controller**

Run:

```bash
rtk git add src/lib/pwaController.js tests/lib/pwaController.test.js
rtk git commit -m "feat: add pwa lifecycle controller"
```

Expected: commit succeeds.

---

### Task 3: PWA Shell Control Renderer

**Files:**
- Create: `src/ui/renderPwaControl.js`
- Create: `tests/ui/renderPwaControl.test.js`
- Modify: `src/ui/renderShell.js`
- Modify: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/ui/renderPwaControl.test.js`:

```js
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
```

Add this test to `tests/ui/renderShell.test.js`:

```js
  it('places PWA controls in the topbar actions before the language selector', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      pwaControl: '<div data-pwa-control>PWA</div>',
      t: createTranslator('en'),
    });

    expect(html).toContain('<div data-pwa-control>PWA</div>');
    expect(html.indexOf('data-pwa-control')).toBeLessThan(html.indexOf('class="language-selector"'));
  });
```

- [ ] **Step 2: Run renderer tests to verify they fail**

Run:

```bash
rtk npm test -- tests/ui/renderPwaControl.test.js tests/ui/renderShell.test.js
```

Expected: FAIL because `renderPwaControl.js` does not exist and `renderShell` does not accept `pwaControl`.

- [ ] **Step 3: Implement the PWA control renderer**

Create `src/ui/renderPwaControl.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderPwaControl({
  pwaState = {},
  t = createTranslator('en'),
} = {}) {
  const installVisible = Boolean(pwaState.pwaSupported && pwaState.installAvailable && !pwaState.isInstalled);
  const updateVisible = Boolean(pwaState.pwaSupported && pwaState.updateAvailable);
  const offlineVisible = pwaState.isOnline === false;

  if (!installVisible && !updateVisible && !offlineVisible) {
    return '';
  }

  const classes = [
    'pwa-control',
    offlineVisible ? 'pwa-control--offline' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-pwa-control>
      ${offlineVisible ? `
        <span class="pwa-status" role="status">
          <strong>${escapeHtml(t('pwa.offline'))}</strong>
          <span>${escapeHtml(t('pwa.offlineDetail'))}</span>
        </span>
      ` : ''}
      ${installVisible ? `
        <button type="button" class="topbar-link pwa-action" data-pwa-install>
          ${escapeHtml(t('pwa.install'))}
        </button>
      ` : ''}
      ${updateVisible ? `
        <button type="button" class="topbar-link pwa-action" data-pwa-update>
          ${escapeHtml(t('pwa.update'))}
        </button>
      ` : ''}
    </div>
  `;
}
```

- [ ] **Step 4: Wire the renderer slot into the shell**

Modify the options destructuring in `src/ui/renderShell.js`:

```js
    pwaControl = '',
    tabNavigation = '',
```

Insert the PWA control inside `<div class="topbar-actions">`, before the routes link:

```js
          ${pwaControl}
          <a class="topbar-link" href="${ROUTES_INDEX_URL}">
            ${t('shell.routesIndex')}
          </a>
```

- [ ] **Step 5: Run renderer tests to verify the missing translations fail**

Run:

```bash
rtk npm test -- tests/ui/renderPwaControl.test.js tests/ui/renderShell.test.js
```

Expected: FAIL because `pwa.install`, `pwa.update`, `pwa.offline`, and `pwa.offlineDetail` are not translated yet.

- [ ] **Step 6: Commit renderer shell slot before translations**

Do not commit yet. Continue to Task 4 so the translation strings, CSS, and binding land in one user-facing UI commit.

---

### Task 4: PWA UI Binding, Translations, And Styling

**Files:**
- Modify: `src/lib/i18n.js`
- Modify: `src/main.js`
- Modify: `styles.css`
- Modify: `tests/ui/renderPwaControl.test.js`
- Modify: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Add PWA translations**

Add these keys to every language dictionary in `src/lib/i18n.js`. Use the English text for non-English dictionaries if a local translation is not already available during implementation; the important behavior is a stable, human-readable string in every supported language.

```js
    'pwa.install': 'Install app',
    'pwa.update': 'Update',
    'pwa.offline': 'Offline',
    'pwa.offlineDetail': 'Cached timetable data stays available.',
```

For Italian, use:

```js
    'pwa.install': 'Installa app',
    'pwa.update': 'Aggiorna',
    'pwa.offline': 'Offline',
    'pwa.offlineDetail': 'Gli orari in cache restano disponibili.',
```

- [ ] **Step 2: Update main app state and imports**

In `src/main.js`, add imports:

```js
import { createPwaController } from './lib/pwaController.js';
import { renderPwaControl } from './ui/renderPwaControl.js';
```

Remove this import:

```js
import { registerServiceWorker } from './lib/registerServiceWorker.js';
```

Add this variable near `let locationPickerRequestId = 0;`:

```js
let pwaController = null;
```

Add `pwa` to the initial `state` object:

```js
  pwa: {
    pwaSupported: false,
    installAvailable: false,
    isInstalled: false,
    isOnline: true,
    updateAvailable: false,
  },
```

- [ ] **Step 3: Add PWA state helpers to main**

Add these functions before `renderApp()` in `src/main.js`:

```js
function rerenderAfterPwaStateChange() {
  if (!app.innerHTML) {
    return;
  }

  renderApp();
  bindInteractions();
}

function updatePwaState(nextPwaState) {
  state.pwa = {
    ...state.pwa,
    ...nextPwaState,
  };
  rerenderAfterPwaStateChange();
}

function initializePwaController() {
  pwaController?.destroy?.();
  pwaController = createPwaController({
    windowObject: window,
    navigatorObject: navigator,
    onStateChange: updatePwaState,
    logger: console,
  });
  state.pwa = pwaController.getState();
  pwaController.register();
}
```

- [ ] **Step 4: Pass rendered PWA control into the shell**

Modify the `renderShell` call in `renderApp()`:

```js
  app.innerHTML = renderShell(parts.join(''), {
    language: state.language,
    languages: SUPPORTED_LANGUAGES,
    adSlots: SHELL_AD_SLOTS,
    datasetInfo: state.metadata,
    taxiDirectory: listTaxiOptions(),
    pwaControl: renderPwaControl({ pwaState: state.pwa, t }),
    tabNavigation: renderTabNav({ activeTab: state.activeTab, t }),
    t,
  });
```

- [ ] **Step 5: Bind PWA install and update buttons**

Add this function near the other `bind*` functions in `src/main.js`:

```js
function bindPwaActions() {
  document.querySelector('[data-pwa-install]')?.addEventListener('click', async () => {
    await pwaController?.promptInstall();
  });

  document.querySelector('[data-pwa-update]')?.addEventListener('click', async () => {
    await pwaController?.applyUpdate();
  });
}
```

Call it from `bindInteractions()`:

```js
  bindPwaActions();
```

- [ ] **Step 6: Initialize PWA controller during boot**

In `boot()`, call `initializePwaController()` before `renderApp()`:

```js
    initializePwaController();
    restoreSearchResultsIfReady();
    renderApp();
```

Remove the old registration call:

```js
    registerServiceWorker();
```

- [ ] **Step 7: Add failing cache expectations for the new PWA modules**

In the `precaches the versioned app shell requested by index.html` test in `tests/lib/serviceWorker.test.js`, add:

```js
    expect(cachedUrls).toContain('./src/lib/pwaController.js');
    expect(cachedUrls).toContain('./src/ui/renderPwaControl.js');
```

- [ ] **Step 8: Run service-worker tests to verify the new expectations fail**

Run:

```bash
rtk npm test -- tests/lib/serviceWorker.test.js
```

Expected: FAIL because the new PWA modules exist now but are not in `REQUIRED_ASSETS`.

- [ ] **Step 9: Add new PWA modules to the service-worker precache**

Add these entries to `REQUIRED_ASSETS` in `service-worker.js`:

```js
  './src/lib/pwaController.js',
```

```js
  './src/ui/renderPwaControl.js',
```

- [ ] **Step 10: Add compact PWA control styles**

Add these styles near the topbar styles in `styles.css`:

```css
.pwa-control {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.pwa-status {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  max-width: 320px;
  padding: 9px 12px;
  border: 1px solid rgba(217, 59, 79, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text);
  font-size: 0.86rem;
  line-height: 1.25;
}

.pwa-status span {
  color: var(--muted);
}

.pwa-action {
  cursor: pointer;
}
```

Add this inside the existing `@media (max-width: 860px)` block:

```css
  .pwa-control,
  .pwa-status {
    width: 100%;
  }

  .pwa-status {
    border-radius: 18px;
  }
```

- [ ] **Step 11: Run UI unit tests**

Run:

```bash
rtk npm test -- tests/ui/renderPwaControl.test.js tests/ui/renderShell.test.js
```

Expected: PASS.

- [ ] **Step 12: Run targeted PWA tests together**

Run:

```bash
rtk npm test -- tests/lib/pwaController.test.js tests/lib/serviceWorker.test.js tests/ui/renderPwaControl.test.js tests/ui/renderShell.test.js
```

Expected: PASS.

- [ ] **Step 13: Commit visible PWA shell UI**

Run:

```bash
rtk git add service-worker.js src/lib/i18n.js src/main.js src/ui/renderPwaControl.js src/ui/renderShell.js styles.css tests/lib/serviceWorker.test.js tests/ui/renderPwaControl.test.js tests/ui/renderShell.test.js
rtk git commit -m "feat: add pwa shell controls"
```

Expected: commit succeeds.

---

### Task 5: SEO Page PWA Wiring

**Files:**
- Modify: `scripts/lib/renderSeoPageHtml.mjs`
- Modify: `tests/scripts/renderSeoPageHtml.test.js`

- [ ] **Step 1: Write failing SEO PWA markup test**

Add this test to `tests/scripts/renderSeoPageHtml.test.js`:

```js
  it('renders PWA metadata and service-worker registration on generated pages', () => {
    const html = renderRoutePageHtml({
      site,
      metadata,
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo',
        lineIds: ['12'],
        dayTypes: ['feriale'],
        departures: [],
      },
    });

    expect(html).toContain('<link rel="manifest" href="/riviera-trasporti-schedules/manifest.webmanifest">');
    expect(html).toContain('<meta name="theme-color" content="#eb4c60">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/riviera-trasporti-schedules/assets/brand/apple-touch-icon.png">');
    expect(html).toContain("navigator.serviceWorker.register('/riviera-trasporti-schedules/service-worker.js')");
    expect(html).toContain("type:'CACHE_URL'");
    expect(html).toContain('url:window.location.href');
  });
```

- [ ] **Step 2: Run SEO generator tests to verify they fail**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: FAIL because generated SEO pages do not include PWA tags or the registration/cache warm-up script.

- [ ] **Step 3: Add PWA head and registration helpers**

Add these helpers in `scripts/lib/renderSeoPageHtml.mjs` after `renderGtmNoScript(site)`:

```js
function renderPwaHead(site) {
  return `  <link rel="icon" type="image/png" sizes="32x32" href="${escapeAttribute(publicPath(site, '/assets/brand/favicon-32x32.png'))}">
  <link rel="icon" type="image/png" sizes="16x16" href="${escapeAttribute(publicPath(site, '/assets/brand/favicon-16x16.png'))}">
  <link rel="apple-touch-icon" href="${escapeAttribute(publicPath(site, '/assets/brand/apple-touch-icon.png'))}">
  <link rel="manifest" href="${escapeAttribute(publicPath(site, '/manifest.webmanifest'))}">
  <meta name="theme-color" content="#eb4c60">`;
}

function renderSeoServiceWorkerScript(site) {
  const serviceWorkerPath = escapeScriptString(publicPath(site, '/service-worker.js'));

  return `  <script>
(function(){
  if(!('serviceWorker' in navigator)){ return; }

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('${serviceWorkerPath}').then(function(){
      return navigator.serviceWorker.ready;
    }).then(function(registration){
      var worker = registration.active || navigator.serviceWorker.controller;
      if(worker){
        worker.postMessage({type:'CACHE_URL',url:window.location.href});
      }
    }).catch(function(error){
      console.error('Service worker registration failed', error);
    });
  });
})();
</script>`;
}
```

- [ ] **Step 4: Render PWA helpers from the SEO layout**

In `renderLayout`, add:

```js
  const pwaHead = renderPwaHead(site);
  const serviceWorkerScript = renderSeoServiceWorkerScript(site);
```

Insert `${pwaHead}` after the canonical link:

```js
  <link rel="canonical" href="${escapeAttribute(canonical)}">
${pwaHead}
  <link rel="stylesheet" href="${escapeAttribute(publicPath(site, '/styles.css'))}">
```

Insert `${serviceWorkerScript}` before `</body>`:

```js
${seoOutboundScript ? `${seoOutboundScript}\n` : ''}${serviceWorkerScript}
</body>
```

- [ ] **Step 5: Run SEO generator tests to verify they pass**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: PASS.

- [ ] **Step 6: Regenerate SEO pages**

Run:

```bash
rtk npm run build:seo
```

Expected: generated `routes/`, `places/`, and `lines/` pages include PWA metadata and service-worker registration.

- [ ] **Step 7: Spot-check one generated route page**

Run:

```bash
rtk rg -n "manifest.webmanifest|service-worker.js|CACHE_URL|theme-color" routes/sanremo/ventimiglia/index.html
```

Expected: output includes all four strings.

- [ ] **Step 8: Commit SEO PWA wiring**

Run:

```bash
rtk git add scripts/lib/renderSeoPageHtml.mjs tests/scripts/renderSeoPageHtml.test.js routes places lines
rtk git commit -m "feat: add pwa metadata to seo pages"
```

Expected: commit succeeds.

---

### Task 6: Manifest Shortcuts And Screenshots

**Files:**
- Modify: `manifest.webmanifest`
- Create: `tests/lib/manifest.test.js`
- Create: `assets/brand/pwa-screenshot-desktop.png`
- Create: `assets/brand/pwa-screenshot-mobile.png`

- [ ] **Step 1: Write failing manifest metadata test**

Create `tests/lib/manifest.test.js`:

```js
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
```

- [ ] **Step 2: Run manifest test to verify it fails**

Run:

```bash
rtk npm test -- tests/lib/manifest.test.js
```

Expected: FAIL because `id`, shortcuts, screenshots, and screenshot files are missing.

- [ ] **Step 3: Update manifest metadata**

Replace `manifest.webmanifest` with:

```json
{
  "id": "./",
  "name": "Azzuriva",
  "short_name": "Azzuriva",
  "description": "Independent Italian Riviera travel companion for direct Riviera Trasporti bus checks.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f1ea",
  "theme_color": "#eb4c60",
  "categories": ["travel", "navigation", "utilities"],
  "icons": [
    {
      "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "shortcuts": [
    {
      "name": "Search",
      "short_name": "Search",
      "description": "Search direct Riviera Trasporti routes.",
      "url": "./?tab=search",
      "icons": [
        {
          "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Browse",
      "short_name": "Browse",
      "description": "Browse lines and stops.",
      "url": "./?tab=browse",
      "icons": [
        {
          "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Saved",
      "short_name": "Saved",
      "description": "Open saved routes and recent searches.",
      "url": "./?tab=saved",
      "icons": [
        {
          "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }
  ],
  "screenshots": [
    {
      "src": "./assets/brand/pwa-screenshot-desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Azzuriva route search on desktop"
    },
    {
      "src": "./assets/brand/pwa-screenshot-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Azzuriva route search on mobile"
    }
  ]
}
```

- [ ] **Step 4: Generate screenshot assets from the app**

Start a local static server:

```bash
rtk python3 -m http.server 4173
```

In another command, generate the desktop screenshot:

```bash
rtk npx playwright screenshot --viewport-size=1280,720 http://127.0.0.1:4173/?tab=search assets/brand/pwa-screenshot-desktop.png
```

Generate the mobile screenshot:

```bash
rtk npx playwright screenshot --viewport-size=390,844 http://127.0.0.1:4173/?tab=search assets/brand/pwa-screenshot-mobile.png
```

Stop the static server after both files exist.

- [ ] **Step 5: Run manifest test to verify it passes**

Run:

```bash
rtk npm test -- tests/lib/manifest.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit manifest metadata and screenshots**

Run:

```bash
rtk git add manifest.webmanifest tests/lib/manifest.test.js assets/brand/pwa-screenshot-desktop.png assets/brand/pwa-screenshot-mobile.png
rtk git commit -m "feat: enrich pwa manifest"
```

Expected: commit succeeds.

---

### Task 7: Browser-Level PWA Verification

**Files:**
- Create: `tests/e2e/pwa.spec.js`

- [ ] **Step 1: Write browser PWA verification tests**

Create `tests/e2e/pwa.spec.js`:

```js
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
});

test('keeps the route search app usable after an offline reload', async ({ context, page }) => {
  await page.goto('/?tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale');
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: /Find direct Riviera Trasporti buses/i })).toBeVisible();
  await expect(page.locator('[data-trip-key]').first()).toBeVisible();
  await expect(page.locator('[data-pwa-control]')).toContainText('Offline');

  await context.setOffline(false);
});

test('keeps a generated route page available after the SEO cache warm-up', async ({ context, page }) => {
  await page.goto('/routes/sanremo/ventimiglia/');
  await expect(page.getByRole('heading', { name: 'Bus Sanremo - Ventimiglia' })).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.waitForTimeout(500);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Bus Sanremo - Ventimiglia' })).toBeVisible();
  await expect(page.locator('main.seo-page')).toContainText('Prime partenze');

  await context.setOffline(false);
});

test('exposes manifest install metadata from the root app', async ({ page }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('./manifest.webmanifest');

  const manifest = await page.evaluate(async () => {
    const response = await fetch(document.querySelector('link[rel="manifest"]').href);
    return response.json();
  });

  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
    './?tab=search',
    './?tab=browse',
    './?tab=saved',
  ]);
  expect(manifest.screenshots.map((screenshot) => screenshot.src)).toEqual([
    './assets/brand/pwa-screenshot-desktop.png',
    './assets/brand/pwa-screenshot-mobile.png',
  ]);
});
```

- [ ] **Step 2: Run PWA browser tests**

Run:

```bash
rtk npm run test:browser -- tests/e2e/pwa.spec.js
```

Expected: PASS. If service-worker state from a prior local run interferes, close browser contexts and rerun the same command.

- [ ] **Step 3: Run the full unit suite**

Run:

```bash
rtk npm test
```

Expected: PASS.

- [ ] **Step 4: Run the smoke suite**

Run:

```bash
rtk npm run test:smoke
```

Expected: PASS.

- [ ] **Step 5: Commit browser PWA verification**

Run:

```bash
rtk git add tests/e2e/pwa.spec.js
rtk git commit -m "test: verify pwa offline behavior"
```

Expected: commit succeeds.

---

## Final Verification

- [ ] **Step 1: Inspect git status**

Run:

```bash
rtk git status --short
```

Expected: no unstaged or staged changes.

- [ ] **Step 2: Confirm commits**

Run:

```bash
rtk git log --oneline -7
```

Expected: recent commits include:

```text
test: verify pwa offline behavior
feat: enrich pwa manifest
feat: add pwa metadata to seo pages
feat: add pwa shell controls
feat: add pwa lifecycle controller
feat: add pwa offline fallback
docs: design full pwa ux
```

---

## Self-Review Notes

- Spec coverage: install UX is covered by Tasks 2-4; offline fallback and route lookup cache by Tasks 1 and 7; SEO pages by Task 5; manifest shortcuts/screenshots by Task 6; update activation by Tasks 1 and 2.
- Type consistency: PWA state uses `pwaSupported`, `installAvailable`, `isInstalled`, `isOnline`, and `updateAvailable` across controller, renderer, and main app integration.
- Scope: this plan stays inside the existing static app and does not add push, background sync, offline maps, or onboarding.
