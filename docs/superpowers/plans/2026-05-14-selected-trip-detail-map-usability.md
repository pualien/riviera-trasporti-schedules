# Selected Trip Detail Map Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make selected departure details the primary results usability improvement while fixing both selected-trip and nearby-stop map failure states.

**Architecture:** Keep the static vanilla JavaScript app and existing renderer/module split. Add richer pure route-map state, extend existing renderers with explicit detail and map states, then wire Leaflet error handling through `src/main.js` without changing the direct-route search engine.

**Tech Stack:** Vanilla JavaScript ES modules, static JSON assets, Leaflet loaded at runtime, browser geolocation, Service Worker optional asset caching, Vitest.

---

## Scope Check

The approved spec contains one cohesive feature area: selected-trip detail as the anchor, with map reliability and small search guidance changes supporting that detail flow. This can be implemented as one plan because all tasks touch the same results and map state path.

## File Structure

Modify:

- `src/lib/routeMap.js`: pure selected-trip map state, including full, partial, unavailable, and load-failed states.
- `tests/lib/routeMap.test.js`: unit coverage for route-map state decisions.
- `src/ui/renderRouteMapPanel.js`: selected-trip detail panel markup and map status copy.
- `tests/ui/renderRouteMapPanel.test.js`: renderer coverage for full, partial, unavailable, and failed map states.
- `src/ui/renderResults.js`: selected and unselected departure card affordances, detail action copy, and selected panel placement.
- `tests/ui/renderResults.test.js`: renderer coverage for selected departure details and actions.
- `src/ui/renderLocationPicker.js`: nearby-stop loading, error, ready, and map-unavailable rendering.
- `tests/ui/renderLocationPicker.test.js`: renderer coverage for nearby-stop states.
- `src/main.js`: clear stale selected-trip state, update selected-trip and nearby-stop Leaflet error handling, pass map error state to renderers.
- `src/lib/i18n.js`: add missing English, Italian, French, German, and Spanish copy.
- `tests/lib/i18n.test.js`: verify key coverage for new copy.
- `src/ui/renderSearchForm.js`: scoped helper copy in the existing search-form intro.
- `tests/ui/renderSearchForm.test.js`: search guidance copy coverage.
- `styles.css`: selected detail layout, departure active state, map status, nearby-stop state styles.
- `service-worker.js`: cache `./assets/data/stop-coordinates.json` as optional data when present.
- `tests/lib/serviceWorker.test.js`: verify optional coordinate asset is listed.

Do not modify generated data builders in this pass unless a static `assets/data/stop-coordinates.json` already exists locally. The app must work honestly with absent or partial coordinates.

## Task 1: Route Map State Model

**Files:**
- Modify: `tests/lib/routeMap.test.js`
- Modify: `src/lib/routeMap.js`

- [ ] **Step 1: Write failing route-map state tests**

Replace `tests/lib/routeMap.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { buildRouteMapState } from '../../src/lib/routeMap.js';

const match = {
  lineId: '12',
  segmentStops: [
    { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
    { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
    { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
  ],
};

describe('buildRouteMapState', () => {
  it('returns a ready map state when every segment stop has coordinates', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.mapStatus).toBe('ready');
    expect(state.hasMap).toBe(true);
    expect(state.points).toEqual([
      { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20', latitude: 43.886, longitude: 8.029 },
      { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45', latitude: 43.846, longitude: 7.852 },
      { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00', latitude: 43.817, longitude: 7.777 },
    ]);
    expect(state.missingStopIds).toEqual([]);
  });

  it('returns a partial map state when at least two stops have coordinates and some are missing', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.mapStatus).toBe('partial');
    expect(state.hasMap).toBe(true);
    expect(state.points.map((point) => point.stopId)).toEqual([
      'imperia-porto-maurizio',
      'sanremo-autostazione',
    ]);
    expect(state.missingStopIds).toEqual(['taggia-stazione']);
  });

  it('returns an unavailable map state when fewer than two stops have coordinates', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
    });

    expect(state.mapStatus).toBe('unavailable');
    expect(state.hasMap).toBe(false);
    expect(state.missingStopIds).toEqual(['taggia-stazione', 'sanremo-autostazione']);
    expect(state.stops).toHaveLength(3);
  });

  it('returns a load-failed map state when map rendering failed after coordinates were available', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    }, {
      mapLoadFailed: true,
    });

    expect(state.mapStatus).toBe('load-failed');
    expect(state.hasMap).toBe(false);
    expect(state.points).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run route-map tests to verify they fail**

Run:

```bash
npm test -- tests/lib/routeMap.test.js
```

Expected: FAIL because `mapStatus` and the third options argument are not implemented.

- [ ] **Step 3: Implement route-map state**

Replace `src/lib/routeMap.js` with:

```js
function isUsableCoordinate(coords) {
  return Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude);
}

export function buildRouteMapState(match, stopCoordinates = {}, { mapLoadFailed = false } = {}) {
  const stops = match.segmentStops.map((stop) => ({
    stopId: stop.stopId,
    label: stop.name,
    time: stop.time,
  }));

  const points = stops
    .map((stop) => {
      const coords = stopCoordinates[stop.stopId];
      return isUsableCoordinate(coords)
        ? { ...stop, latitude: coords.latitude, longitude: coords.longitude }
        : null;
    })
    .filter(Boolean);

  const missingStopIds = stops
    .filter((stop) => !isUsableCoordinate(stopCoordinates[stop.stopId]))
    .map((stop) => stop.stopId);

  const coordinateStatus = points.length >= 2
    ? (missingStopIds.length ? 'partial' : 'ready')
    : 'unavailable';
  const mapStatus = mapLoadFailed && points.length >= 2
    ? 'load-failed'
    : coordinateStatus;

  return {
    hasMap: mapStatus === 'ready' || mapStatus === 'partial',
    mapStatus,
    stops,
    points,
    missingStopIds,
  };
}
```

- [ ] **Step 4: Run route-map tests to verify they pass**

Run:

```bash
npm test -- tests/lib/routeMap.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit route-map state**

Run:

```bash
git add src/lib/routeMap.js tests/lib/routeMap.test.js
git commit -m "feat: model selected trip map states"
```

## Task 2: Selected-Trip Detail Panel Renderer

**Files:**
- Modify: `tests/ui/renderRouteMapPanel.test.js`
- Modify: `src/ui/renderRouteMapPanel.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/lib/i18n.test.js`

- [ ] **Step 1: Write failing selected-trip panel tests**

Replace `tests/ui/renderRouteMapPanel.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderRouteMapPanel } from '../../src/ui/renderRouteMapPanel.js';

const match = {
  lineId: '12',
  direction: 'ANDORA - SANREMO',
  departureTime: '06:20',
  arrivalTime: '07:00',
  durationMinutes: 40,
  sourcePage: 23,
};

const stops = [
  { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20' },
  { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45' },
  { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00' },
];

describe('renderRouteMapPanel', () => {
  it('renders selected trip details with ready map container and official PDF action', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      pdfUrl: 'https://example.com/riviera.pdf',
      mapState: {
        hasMap: true,
        mapStatus: 'ready',
        stops,
        points: [],
        missingStopIds: [],
      },
    });

    expect(html).toContain('Selected trip details');
    expect(html).toContain('Line 12');
    expect(html).toContain('06:20');
    expect(html).toContain('07:00');
    expect(html).toContain('40 min');
    expect(html).toContain('https://example.com/riviera.pdf#page=23');
    expect(html).toContain('data-map-status="ready"');
    expect(html).not.toContain('Map coordinates are not yet available');
  });

  it('renders partial coordinate copy while preserving the stop sequence', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: true,
        mapStatus: 'partial',
        stops,
        points: [],
        missingStopIds: ['taggia-stazione'],
      },
    });

    expect(html).toContain('Some stops are listed below without map coordinates.');
    expect(html).toContain('06:45 · taggia stazione');
    expect(html).toContain('data-map-status="partial"');
  });

  it('renders unavailable coordinate copy without hiding the trip details', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: false,
        mapStatus: 'unavailable',
        stops,
        points: [],
        missingStopIds: stops.map((stop) => stop.stopId),
      },
    });

    expect(html).toContain('Map coordinates are not yet available for this trip.');
    expect(html).toContain('Selected trip details');
    expect(html).toContain('06:20 · imperia porto maurizio');
  });

  it('renders map load failure copy', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: false,
        mapStatus: 'load-failed',
        stops,
        points: [],
        missingStopIds: [],
      },
    });

    expect(html).toContain('The map could not load.');
    expect(html).toContain('Use the stop list and official PDF to confirm this trip.');
  });
});
```

- [ ] **Step 2: Run selected-trip panel tests to verify they fail**

Run:

```bash
npm test -- tests/ui/renderRouteMapPanel.test.js
```

Expected: FAIL because the new detail copy, PDF link, and map statuses are not rendered yet.

- [ ] **Step 3: Add selected-trip translation keys**

Add these exact keys to every language dictionary in `src/lib/i18n.js`:

```js
// Italian
'results.selectedTripDetails': 'Dettagli corsa selezionata',
'results.detailsAction': 'Dettagli',
'results.selectedAction': 'Selezionata',
'results.mapPartial': 'Alcune fermate sono elencate sotto senza coordinate sulla mappa.',
'results.mapNoCoordinates': 'Le coordinate mappa non sono ancora disponibili per questa corsa.',
'results.mapLoadFailed': 'La mappa non si e caricata.',
'results.mapLoadFailedDetail': 'Usa l elenco fermate e il PDF ufficiale per confermare questa corsa.',
```

```js
// English
'results.selectedTripDetails': 'Selected trip details',
'results.detailsAction': 'Details',
'results.selectedAction': 'Selected',
'results.mapPartial': 'Some stops are listed below without map coordinates.',
'results.mapNoCoordinates': 'Map coordinates are not yet available for this trip.',
'results.mapLoadFailed': 'The map could not load.',
'results.mapLoadFailedDetail': 'Use the stop list and official PDF to confirm this trip.',
```

```js
// French
'results.selectedTripDetails': 'Details de la course choisie',
'results.detailsAction': 'Details',
'results.selectedAction': 'Selectionnee',
'results.mapPartial': 'Certaines arrets sont listes ci-dessous sans coordonnees cartographiques.',
'results.mapNoCoordinates': 'Les coordonnees de carte ne sont pas encore disponibles pour cette course.',
'results.mapLoadFailed': 'La carte n a pas pu se charger.',
'results.mapLoadFailedDetail': 'Utilisez la liste des arrets et le PDF officiel pour confirmer cette course.',
```

```js
// German
'results.selectedTripDetails': 'Details der gewaehlten Fahrt',
'results.detailsAction': 'Details',
'results.selectedAction': 'Ausgewaehlt',
'results.mapPartial': 'Einige Haltestellen stehen unten ohne Kartenkoordinaten.',
'results.mapNoCoordinates': 'Fuer diese Fahrt sind noch keine Kartenkoordinaten verfuegbar.',
'results.mapLoadFailed': 'Die Karte konnte nicht geladen werden.',
'results.mapLoadFailedDetail': 'Nutze die Haltestellenliste und das offizielle PDF zur Kontrolle dieser Fahrt.',
```

```js
// Spanish
'results.selectedTripDetails': 'Detalles del viaje seleccionado',
'results.detailsAction': 'Detalles',
'results.selectedAction': 'Seleccionado',
'results.mapPartial': 'Algunas paradas aparecen abajo sin coordenadas de mapa.',
'results.mapNoCoordinates': 'Las coordenadas del mapa aun no estan disponibles para este viaje.',
'results.mapLoadFailed': 'El mapa no se pudo cargar.',
'results.mapLoadFailedDetail': 'Usa la lista de paradas y el PDF oficial para confirmar este viaje.',
```

- [ ] **Step 4: Implement selected-trip detail renderer**

Replace `src/ui/renderRouteMapPanel.js` with:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function mapMessage(t, mapState) {
  if (mapState.mapStatus === 'partial') {
    return t('results.mapPartial');
  }

  if (mapState.mapStatus === 'load-failed') {
    return `${t('results.mapLoadFailed')} ${t('results.mapLoadFailedDetail')}`;
  }

  if (mapState.mapStatus === 'unavailable') {
    return t('results.mapNoCoordinates');
  }

  return '';
}

function pdfHref(pdfUrl, sourcePage) {
  if (!pdfUrl || pdfUrl === '#') {
    return '#';
  }

  return sourcePage ? `${pdfUrl}#page=${sourcePage}` : pdfUrl;
}

export function renderRouteMapPanel({
  t = createTranslator('en'),
  match,
  mapState,
  pdfUrl = '#',
}) {
  const message = mapMessage(t, mapState);
  const duration = Number.isFinite(match.durationMinutes)
    ? `<span>${escapeHtml(match.durationMinutes)} min</span>`
    : '';

  return `
    <section class="route-map-panel" data-testid="route-map-panel">
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(t('results.selectedTripMap'))}</p>
        <h3>${escapeHtml(t('results.selectedTripDetails'))}</h3>
        <p>${escapeHtml(t('results.selectedTripMapSubtitle'))}</p>
      </div>
      <div class="route-map-meta">
        <strong>${escapeHtml(t('results.line'))} ${escapeHtml(match.lineId)}</strong>
        <span>${escapeHtml(match.departureTime)} &rarr; ${escapeHtml(match.arrivalTime)}</span>
        ${duration}
        <a href="${escapeHtml(pdfHref(pdfUrl, match.sourcePage))}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPdf'))}</a>
      </div>
      <div
        id="selected-trip-map"
        class="location-map"
        data-map-status="${escapeHtml(mapState.mapStatus)}"
      >
        ${mapState.hasMap ? '' : escapeHtml(message)}
      </div>
      ${mapState.hasMap && message ? `<p class="route-map-message">${escapeHtml(message)}</p>` : ''}
      <ol class="route-stop-list">
        ${mapState.stops.map((stop) => `<li>${escapeHtml(stop.time)} · ${escapeHtml(stop.label)}</li>`).join('')}
      </ol>
    </section>
  `;
}
```

- [ ] **Step 5: Add i18n key coverage**

Add this test to `tests/lib/i18n.test.js`:

```js
it('translates selected-trip map status copy in every supported language', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const t = createTranslator(language.code);

    expect(t('results.selectedTripDetails')).not.toBe('results.selectedTripDetails');
    expect(t('results.detailsAction')).not.toBe('results.detailsAction');
    expect(t('results.selectedAction')).not.toBe('results.selectedAction');
    expect(t('results.mapPartial')).not.toBe('results.mapPartial');
    expect(t('results.mapNoCoordinates')).not.toBe('results.mapNoCoordinates');
    expect(t('results.mapLoadFailed')).not.toBe('results.mapLoadFailed');
    expect(t('results.mapLoadFailedDetail')).not.toBe('results.mapLoadFailedDetail');
  }
});
```

- [ ] **Step 6: Run selected-trip panel and i18n tests**

Run:

```bash
npm test -- tests/ui/renderRouteMapPanel.test.js tests/lib/i18n.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit selected-trip panel renderer**

Run:

```bash
git add src/ui/renderRouteMapPanel.js tests/ui/renderRouteMapPanel.test.js src/lib/i18n.js tests/lib/i18n.test.js
git commit -m "feat: render selected trip detail states"
```

## Task 3: Results Departure Affordance And Panel Wiring

**Files:**
- Modify: `tests/ui/renderResults.test.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write failing results renderer test**

Add this test to `tests/ui/renderResults.test.js`:

```js
it('labels selected and unselected departure detail actions clearly', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    pdfUrl: 'https://example.com/riviera.pdf',
    summary: {
      serviceEnded: false,
      nextDeparture: null,
      soonestArrival: null,
      lastDepartureTime: '19:45',
      averageDurationMinutes: 39,
      lines: ['12'],
    },
    nextDepartures: [
      {
        tripKey: 'selected-trip',
        departureTime: '06:20',
        arrivalTime: '07:00',
        durationMinutes: 40,
        lineId: '12',
        sourcePage: 23,
      },
      {
        tripKey: 'other-trip',
        departureTime: '07:05',
        arrivalTime: '07:46',
        durationMinutes: 41,
        lineId: '12',
        sourcePage: 23,
      },
    ],
    allDepartures: [],
    selectedTripKey: 'selected-trip',
    selectedTripPanel: '<section data-testid="route-map-panel">panel</section>',
  });

  expect(html).toContain('departure-card departure-card--selected');
  expect(html).toContain('Selected');
  expect(html).toContain('Details');
  expect(html).toContain('data-testid="route-map-panel"');
});
```

- [ ] **Step 2: Run results tests to verify they fail**

Run:

```bash
npm test -- tests/ui/renderResults.test.js
```

Expected: FAIL until departure cards use the new action labels.

- [ ] **Step 3: Update result departure card rendering**

In `src/ui/renderResults.js`, replace `renderDepartureCard` with:

```js
function renderDepartureCard(departure, t, pdfUrl) {
  const className = departure.isSelected
    ? 'departure-card departure-card--selected'
    : 'departure-card';
  const actionLabel = departure.isSelected
    ? t('results.selectedAction')
    : t('results.detailsAction');

  return `
    <article class="${className}" data-trip-key="${departure.tripKey ?? ''}">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <span>${actionLabel}</span>
        <a href="${pdfUrl}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
      </div>
    </article>
  `;
}
```

Update the existing test assertion that expects `Show trip on map` so it expects `Selected`.

- [ ] **Step 4: Pass PDF URL to selected-trip panel**

In `src/main.js`, replace `currentSelectedTripPanel(t)` with:

```js
function currentSelectedTripPanel(t) {
  const selectedTripMatch = currentSelectedTripMatch();

  if (!selectedTripMatch) {
    return '';
  }

  return renderRouteMapPanel({
    t,
    match: selectedTripMatch,
    pdfUrl: state.metadata?.source?.url ?? '#',
    mapState: buildRouteMapState(
      selectedTripMatch,
      state.stopCoordinates,
      {
        mapLoadFailed: state.resultState?.selectedTripMapLoadFailed === true,
      },
    ),
  });
}
```

- [ ] **Step 5: Run results and panel tests**

Run:

```bash
npm test -- tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit results affordance**

Run:

```bash
git add src/ui/renderResults.js tests/ui/renderResults.test.js src/main.js
git commit -m "feat: clarify selected departure details"
```

## Task 4: Selected-Trip Map Load Failure Wiring

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Run current focused tests before wiring**

Run:

```bash
npm test -- tests/lib/routeMap.test.js tests/ui/renderRouteMapPanel.test.js tests/ui/renderResults.test.js
```

Expected: PASS from prior tasks.

- [ ] **Step 2: Make selected-trip map rendering report success**

In `src/main.js`, replace `renderSelectedTripMap(mapState)` with:

```js
async function renderSelectedTripMap(mapState) {
  if (!mapState.hasMap) {
    return false;
  }

  const mapElement = document.querySelector('#selected-trip-map');

  if (!mapElement || mapElement._leaflet_id) {
    return true;
  }

  try {
    const L = await ensureLeaflet();
    const coordinates = mapState.points.map((point) => [point.latitude, point.longitude]);
    const map = L.map(mapElement, {
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.polyline(coordinates, {
      color: '#d93b4f',
      weight: 4,
    }).addTo(map);

    mapState.points.forEach((point) => {
      L.marker([point.latitude, point.longitude]).addTo(map).bindPopup(`${point.time} · ${point.label}`);
    });

    map.fitBounds(coordinates, { padding: [24, 24] });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
```

- [ ] **Step 3: Preserve selected-trip detail when map loading fails**

In `bindDepartureSelection()`, replace the block after `renderApp(); bindInteractions();` with:

```js
      const mapState = buildRouteMapState(match, state.stopCoordinates);
      if (mapState.hasMap) {
        const mapRendered = await renderSelectedTripMap(mapState);
        if (!mapRendered && state.resultState?.type === 'results') {
          state.resultState = {
            ...state.resultState,
            selectedTripMapLoadFailed: true,
          };
          renderApp();
          bindInteractions();
        }
      }
```

In the same function, when setting `state.resultState`, include `selectedTripMapLoadFailed: false`:

```js
      state.resultState = {
        ...state.resultState,
        selectedTripKey: tripKey,
        selectedTripMapLoadFailed: false,
      };
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- tests/lib/routeMap.test.js tests/ui/renderRouteMapPanel.test.js tests/ui/renderResults.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit selected-trip map failure wiring**

Run:

```bash
git add src/main.js
git commit -m "fix: preserve selected trip details when map loading fails"
```

## Task 5: Nearby-Stop Picker State Rendering

**Files:**
- Modify: `tests/ui/renderLocationPicker.test.js`
- Modify: `src/ui/renderLocationPicker.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/lib/i18n.test.js`

- [ ] **Step 1: Write failing nearby picker renderer tests**

Append these tests to `tests/ui/renderLocationPicker.test.js`:

```js
it('renders denied location errors without an empty map shell', () => {
  const html = renderLocationPicker({
    fieldName: 'from',
    state: 'error',
    message: 'Location access was denied. Type the stop name manually instead.',
    t: createTranslator('en'),
  });

  expect(html).toContain('Location access was denied');
  expect(html).not.toContain('id="location-picker-map"');
  expect(html).toContain('Use manual search');
});

it('renders ready nearby stop choices when the map script is unavailable', () => {
  const html = renderLocationPicker({
    fieldName: 'from',
    state: 'ready',
    mapState: 'unavailable',
    mapMessage: 'The map could not load. Nearby stop choices are still available.',
    t: createTranslator('en'),
    nearbyStops: [
      {
        stopId: 'imperia-porto-maurizio',
        canonical: 'imperia porto maurizio',
        localityLabel: 'Porto Maurizio',
        distanceMeters: 180,
      },
    ],
  });

  expect(html).toContain('The map could not load');
  expect(html).toContain('imperia porto maurizio');
  expect(html).toContain('data-map-status="unavailable"');
});

it('renders loading state inside the map shell', () => {
  const html = renderLocationPicker({
    fieldName: 'to',
    state: 'loading',
    t: createTranslator('en'),
  });

  expect(html).toContain('Looking for the closest stops');
  expect(html).toContain('Loading map');
  expect(html).toContain('data-map-status="loading"');
});
```

- [ ] **Step 2: Run nearby picker tests to verify they fail**

Run:

```bash
npm test -- tests/ui/renderLocationPicker.test.js
```

Expected: FAIL because `mapState`, `mapMessage`, and manual-search copy are not rendered yet.

- [ ] **Step 3: Add nearby-state translation keys**

Add these exact keys to every language dictionary in `src/lib/i18n.js`:

```js
// Italian
'location.manualSearch': 'Usa la ricerca manuale',
'location.error.map': 'La mappa non si e caricata. Le fermate vicine restano disponibili.',
```

```js
// English
'location.manualSearch': 'Use manual search',
'location.error.map': 'The map could not load. Nearby stop choices are still available.',
```

```js
// French
'location.manualSearch': 'Utiliser la recherche manuelle',
'location.error.map': 'La carte n a pas pu se charger. Les choix de fermates proches restent disponibles.',
```

```js
// German
'location.manualSearch': 'Manuelle Suche verwenden',
'location.error.map': 'Die Karte konnte nicht geladen werden. Nahe Haltestellen bleiben verfuegbar.',
```

```js
// Spanish
'location.manualSearch': 'Usar busqueda manual',
'location.error.map': 'El mapa no se pudo cargar. Las paradas cercanas siguen disponibles.',
```

- [ ] **Step 4: Implement nearby picker state rendering**

Replace `src/ui/renderLocationPicker.js` with:

```js
import { createTranslator } from '../lib/i18n.js';

function formatDistance(distanceMeters) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${distanceMeters} m`;
}

export function renderLocationPicker({
  fieldName,
  state,
  nearbyStops = [],
  message = '',
  mapState = state === 'loading' ? 'loading' : 'ready',
  mapMessage = '',
  t = createTranslator('en'),
}) {
  const title = fieldName === 'to' ? t('location.title.to') : t('location.title.from');

  if (state === 'error') {
    return `
      <section class="location-picker location-picker--error" data-field-name="${fieldName}">
        <div class="location-picker-copy">
          <p class="eyebrow">${t('location.eyebrow')}</p>
          <h3>${title}</h3>
          <p>${message}</p>
          <p class="location-picker-message">${t('location.manualSearch')}</p>
        </div>
      </section>
    `;
  }

  const nearbyMarkup = state === 'ready' && nearbyStops.length
    ? nearbyStops
      .map(
        (stop) => `
          <button type="button" class="nearby-stop" data-stop-id="${stop.stopId}">
            <span>
              <strong>${stop.canonical}</strong>
              <small>${stop.localityLabel ?? stop.label ?? stop.canonical}</small>
            </span>
            <span>${formatDistance(stop.distanceMeters)}</span>
          </button>
        `,
      )
      .join('')
    : state === 'loading'
      ? `<p class="location-picker-message">${t('location.loading')}</p>`
      : `<p class="location-picker-message">${t('location.none')}</p>`;
  const resolvedMapMessage = mapState === 'unavailable'
    ? (mapMessage || t('location.error.map'))
    : (state === 'loading' ? t('location.loadingMap') : '');

  return `
    <section class="location-picker" data-field-name="${fieldName}">
      <div class="location-picker-copy">
        <p class="eyebrow">${t('location.eyebrow')}</p>
        <h3>${title}</h3>
        <p>${t('location.guidance')}</p>
      </div>
      <div class="location-map-shell">
        <div id="location-picker-map" class="location-map" data-map-status="${mapState}">${resolvedMapMessage}</div>
      </div>
      <div class="location-choices">
        <div class="section-head">
          <h3>${t('location.nearestStops')}</h3>
          <p>${t('location.confirmExact')}</p>
        </div>
        <div class="nearby-stop-list">
          ${nearbyMarkup}
        </div>
      </div>
    </section>
  `;
}
```

- [ ] **Step 5: Add i18n key coverage**

Add these assertions to the selected-trip i18n coverage test from Task 2:

```js
    expect(t('location.manualSearch')).not.toBe('location.manualSearch');
    expect(t('location.error.map')).not.toBe('location.error.map');
```

- [ ] **Step 6: Run nearby picker and i18n tests**

Run:

```bash
npm test -- tests/ui/renderLocationPicker.test.js tests/lib/i18n.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit nearby picker rendering**

Run:

```bash
git add src/ui/renderLocationPicker.js tests/ui/renderLocationPicker.test.js src/lib/i18n.js tests/lib/i18n.test.js
git commit -m "feat: clarify nearby map states"
```

## Task 6: Nearby-Stop Map Load Failure Wiring

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Make nearby map rendering report success**

In `src/main.js`, replace `renderNearbyMap()` with:

```js
async function renderNearbyMap() {
  if (!state.locationPicker || state.locationPicker.state !== 'ready') {
    return false;
  }

  const mapElement = document.querySelector('#location-picker-map');

  if (!mapElement || !state.locationPicker.coords) {
    return false;
  }

  if (mapElement._leaflet_id) {
    return true;
  }

  try {
    const L = await ensureLeaflet();
    const { latitude, longitude } = state.locationPicker.coords;
    const map = L.map(mapElement, {
      zoomControl: false,
      attributionControl: true,
    }).setView([latitude, longitude], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.circleMarker([latitude, longitude], {
      radius: 8,
      color: '#d93b4f',
      weight: 3,
      fillColor: '#eb4c60',
      fillOpacity: 0.35,
    }).addTo(map);

    for (const stop of state.locationPicker.nearbyStops) {
      L.marker([stop.latitude, stop.longitude]).addTo(map).bindPopup(stop.canonical);
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
```

- [ ] **Step 2: Pass nearby map status to the renderer**

In `renderApp()`, update the `renderLocationPicker` call to preserve all `state.locationPicker` properties. Replace:

```js
    parts.push(renderLocationPicker({
      ...state.locationPicker,
      message: state.locationPicker.messageKey ? t(state.locationPicker.messageKey) : state.locationPicker.message,
      t,
    }));
```

with:

```js
    parts.push(renderLocationPicker({
      ...state.locationPicker,
      message: state.locationPicker.messageKey ? t(state.locationPicker.messageKey) : state.locationPicker.message,
      mapMessage: state.locationPicker.mapMessageKey ? t(state.locationPicker.mapMessageKey) : state.locationPicker.mapMessage,
      t,
    }));
```

- [ ] **Step 3: Preserve nearby stop choices when map loading fails**

In `openLocationPicker(fieldName)`, in the ready branch, include `mapState: 'ready'`:

```js
          mapState: 'ready',
```

Replace the post-render ready block:

```js
    if (state.locationPicker?.state === 'ready') {
      await renderNearbyMap();
      bindNearbyStopSelection();
    }
```

with:

```js
    if (state.locationPicker?.state === 'ready') {
      const mapRendered = await renderNearbyMap();
      if (!mapRendered && state.locationPicker?.state === 'ready') {
        state.locationPicker = {
          ...state.locationPicker,
          mapState: 'unavailable',
          mapMessageKey: 'location.error.map',
        };
        renderApp();
        bindInteractions();
      }
      bindNearbyStopSelection();
    }
```

- [ ] **Step 4: Run nearby picker tests**

Run:

```bash
npm test -- tests/ui/renderLocationPicker.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit nearby map wiring**

Run:

```bash
git add src/main.js
git commit -m "fix: keep nearby stop choices when map loading fails"
```

## Task 7: Clear Stale Selected-Trip State

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Identify state mutations that must clear selected trip**

In `src/main.js`, search:

```bash
rg -n "resultState = null|formValues = \\{|fromInput|toInput|dayType" src/main.js
```

Expected: Find route input handlers, browse seeding, saved-route restore, and language-only mutations. Only route-changing mutations clear selected-trip state.

- [ ] **Step 2: Add a route-result clearing helper**

In `src/main.js`, after `currentSelectedTripMatch()`, add:

```js
function clearRouteResults() {
  state.resultState = null;
}
```

- [ ] **Step 3: Replace route-changing result clears**

Replace route-changing occurrences of:

```js
state.resultState = null;
```

with:

```js
clearRouteResults();
```

Do not change language selection, tab navigation, or saved-route remove actions unless they alter current route inputs.

- [ ] **Step 4: Run main renderer and state tests**

Run:

```bash
npm test -- tests/lib/routeUrlState.test.js tests/lib/routePickerState.test.js tests/ui/renderResults.test.js tests/ui/renderSearchForm.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit stale-state cleanup**

Run:

```bash
git add src/main.js
git commit -m "fix: clear selected trip details on route changes"
```

## Task 8: Search Guidance Copy

**Files:**
- Modify: `tests/ui/renderSearchForm.test.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/lib/i18n.test.js`

- [ ] **Step 1: Write failing search guidance test**

Add this test to `tests/ui/renderSearchForm.test.js`:

```js
it('guides users from route selection to selected departure details without a wizard', () => {
  const html = renderSearchForm({
    t: createTranslator('en'),
    fromLocalitySelected: true,
    exactFromStop: null,
    toStopSelected: true,
  });

  expect(html).toContain('Choose an origin area or exact stop.');
  expect(html).toContain('Direct destinations appear after the origin is known.');
  expect(html).toContain('Select one departure to inspect exact trip details.');
});
```

- [ ] **Step 2: Run search form test to verify it fails**

Run:

```bash
npm test -- tests/ui/renderSearchForm.test.js
```

Expected: FAIL because the exact guidance copy is not rendered.

- [ ] **Step 3: Add search guidance translation keys**

Add these exact keys to every language dictionary in `src/lib/i18n.js`:

```js
// Italian
'search.guidance.origin': 'Scegli una zona di partenza o una fermata esatta.',
'search.guidance.destination': 'Le destinazioni dirette appaiono dopo aver scelto l origine.',
'search.guidance.departure': 'Seleziona una partenza per vedere i dettagli esatti della corsa.',
```

```js
// English
'search.guidance.origin': 'Choose an origin area or exact stop.',
'search.guidance.destination': 'Direct destinations appear after the origin is known.',
'search.guidance.departure': 'Select one departure to inspect exact trip details.',
```

```js
// French
'search.guidance.origin': 'Choisissez une zone de depart ou un arret exact.',
'search.guidance.destination': 'Les destinations directes apparaissent apres le choix de l origine.',
'search.guidance.departure': 'Selectionnez un depart pour voir les details exacts de la course.',
```

```js
// German
'search.guidance.origin': 'Waehle einen Abfahrtsbereich oder eine genaue Haltestelle.',
'search.guidance.destination': 'Direkte Ziele erscheinen, nachdem der Ursprung bekannt ist.',
'search.guidance.departure': 'Waehle eine Abfahrt, um die genauen Fahrtdetails zu sehen.',
```

```js
// Spanish
'search.guidance.origin': 'Elige una zona de origen o una parada exacta.',
'search.guidance.destination': 'Los destinos directos aparecen cuando se conoce el origen.',
'search.guidance.departure': 'Selecciona una salida para ver los detalles exactos del viaje.',
```

- [ ] **Step 4: Render guidance copy in the existing intro**

In `src/ui/renderSearchForm.js`, inside `<div class="search-form-intro">` after the existing `renderRouteProgress` template call, add:

```js
          <div class="route-guidance">
            <span>${escapeHtml(t('search.guidance.origin'))}</span>
            <span>${escapeHtml(t('search.guidance.destination'))}</span>
            <span>${escapeHtml(t('search.guidance.departure'))}</span>
          </div>
```

- [ ] **Step 5: Add i18n key coverage**

Add these assertions to the existing new i18n coverage loop:

```js
    expect(t('search.guidance.origin')).not.toBe('search.guidance.origin');
    expect(t('search.guidance.destination')).not.toBe('search.guidance.destination');
    expect(t('search.guidance.departure')).not.toBe('search.guidance.departure');
```

- [ ] **Step 6: Run search form and i18n tests**

Run:

```bash
npm test -- tests/ui/renderSearchForm.test.js tests/lib/i18n.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit search guidance**

Run:

```bash
git add src/ui/renderSearchForm.js tests/ui/renderSearchForm.test.js src/lib/i18n.js tests/lib/i18n.test.js
git commit -m "feat: guide users toward selected trip details"
```

## Task 9: Styles And Optional Coordinate Asset Cache

**Files:**
- Modify: `styles.css`
- Modify: `service-worker.js`
- Modify: `tests/lib/serviceWorker.test.js`

- [ ] **Step 1: Write service-worker optional asset test**

Add this test to `tests/lib/serviceWorker.test.js`:

```js
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
});
```

- [ ] **Step 2: Run service worker test**

Run:

```bash
npm test -- tests/lib/serviceWorker.test.js
```

Expected: PASS because `./assets/data/stop-coordinates.json` is currently listed in `OPTIONAL_ASSETS` and optional cache failures are swallowed.

- [ ] **Step 3: Add selected-trip and map-state styles**

Append this block to `styles.css` near the existing route map and location picker styles:

```css
.departure-card--selected {
  border-color: rgba(217, 59, 79, 0.72);
  box-shadow: 0 0 0 3px rgba(235, 76, 96, 0.12), var(--shadow-soft);
}

.route-map-panel .eyebrow {
  margin: 0;
}

.route-map-message,
.location-picker-message {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.location-map[data-map-status="partial"],
.location-map[data-map-status="unavailable"],
.location-map[data-map-status="load-failed"] {
  display: grid;
  place-items: center;
  padding: 18px;
  text-align: center;
  color: var(--muted);
  background:
    linear-gradient(135deg, rgba(239, 228, 214, 0.9), rgba(255, 255, 255, 0.86));
}

.location-map[data-map-status="ready"] {
  background: rgba(255, 255, 255, 0.72);
}

.location-picker--error {
  border-color: rgba(217, 59, 79, 0.24);
}

.route-guidance {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.45;
}
```

If `--shadow-soft` does not exist in `styles.css`, use:

```css
box-shadow: 0 0 0 3px rgba(235, 76, 96, 0.12), 0 16px 28px rgba(93, 63, 35, 0.12);
```

- [ ] **Step 4: Run focused style-adjacent tests**

Run:

```bash
npm test -- tests/lib/serviceWorker.test.js tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js tests/ui/renderLocationPicker.test.js tests/ui/renderSearchForm.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit styles and cache assertion**

Run:

```bash
git add styles.css service-worker.js tests/lib/serviceWorker.test.js
git commit -m "style: polish trip detail map states"
```

## Task 10: Final Verification

**Files:**
- Verify all changed files

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Start a local static server**

Run:

```bash
python3 -m http.server 4173
```

Expected: server starts on `http://127.0.0.1:4173/`.

- [ ] **Step 3: Browser-check the selected-trip detail flow**

Open `http://127.0.0.1:4173/` in the in-app browser.

Manual path:

1. Choose an origin area.
2. Choose a direct destination.
3. Submit the search.
4. Select one departure card.

Expected:

- selected card is visibly active
- selected-trip detail panel appears
- stop sequence remains visible
- map area renders a route, partial map, or honest unavailable state
- official PDF link points to the selected departure source page

- [ ] **Step 4: Browser-check nearby stop failure behavior**

Open the nearby-stop control.

Expected:

- if location permission is denied, the UI shows manual-search guidance without an empty map shell
- if lookup succeeds but Leaflet fails, nearby choices remain visible with map-unavailable copy
- manual route search remains usable

- [ ] **Step 5: Stop local server**

Stop the server process with `Ctrl+C` in its terminal session.

- [ ] **Step 6: Check git status**

Run:

```bash
git status --short
```

Expected: only intentional tracked changes from this plan are present. Existing unrelated untracked files such as `.impeccable/`, `.playwright-cli/`, and older untracked plan files may remain untouched.

- [ ] **Step 7: Commit final verification fixes if needed**

If browser verification required small fixes, run:

```bash
git add src/lib/routeMap.js src/ui/renderRouteMapPanel.js src/ui/renderResults.js src/ui/renderLocationPicker.js src/ui/renderSearchForm.js src/main.js src/lib/i18n.js styles.css service-worker.js tests/lib/routeMap.test.js tests/ui/renderRouteMapPanel.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js tests/ui/renderSearchForm.test.js tests/lib/i18n.test.js tests/lib/serviceWorker.test.js
git commit -m "fix: verify trip detail map usability"
```

Expected: commit is created only if fixes were needed after verification.
