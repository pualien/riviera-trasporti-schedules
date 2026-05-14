const CACHE_NAME = 'riviera-route-tools-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/brand/apple-touch-icon.png',
  './assets/brand/favicon-16x16.png',
  './assets/brand/favicon-32x32.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png',
  './assets/data/trips.json',
  './assets/data/stops.json',
  './assets/data/lines.json',
  './assets/data/metadata.json',
  './assets/data/localities.json',
  './assets/data/reachability.json',
  './assets/data/stop-coordinates.json',
  './data/manual/localities.json',
  './src/main.js',
  './src/lib/analytics.js',
  './src/lib/appBootstrap.js',
  './src/lib/brand.js',
  './src/lib/browseIndex.js',
  './src/lib/fromSuggestions.js',
  './src/lib/i18n.js',
  './src/lib/localities.js',
  './src/lib/nearbyStops.js',
  './src/lib/normalize.js',
  './src/lib/provinceLookup.js',
  './src/lib/query.js',
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
  './src/lib/time.js',
  './src/lib/transferSuggestions.js',
  './src/ui/renderBrowseView.js',
  './src/ui/renderEmptyState.js',
  './src/ui/renderLocationPicker.js',
  './src/ui/renderNoDirectFallback.js',
  './src/ui/renderResults.js',
  './src/ui/renderRouteMapPanel.js',
  './src/ui/renderSavedView.js',
  './src/ui/renderSearchForm.js',
  './src/ui/renderShell.js',
  './src/ui/renderTabNav.js',
  './src/ui/renderTaxiOption.js',
  './src/ui/renderTransferSuggestions.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      APP_ASSETS.map((url) => cache.add(url).catch(() => null)),
    )),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )),
  );
});

async function cacheResponse(request, response) {
  if (!response.ok || response.type !== 'basic') {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

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
        const fallback = await caches.match('./index.html');
        if (fallback) {
          return fallback;
        }
      }

      throw error;
    }
  })());
});
