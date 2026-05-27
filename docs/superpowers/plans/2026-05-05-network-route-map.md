# Network-Wide Route Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `From` field easy to browse across the full network and show a stop-by-stop route map only after the user selects one departure.

**Architecture:** Keep the existing exact-stop direct-trip engine, but add two thin layers around it: a pure suggestion builder for the `From` panel and a pure route-map state builder for selected departures. The UI remains list-first, with `main.js` wiring the new suggestion sections, selected departure state, and Leaflet route rendering when coordinates exist.

**Tech Stack:** Vanilla JavaScript, Vitest, Leaflet, static JSON assets

---

## File Structure

- Modify: `src/main.js`
  - Keep app state, field-panel behavior, submit flow, and runtime Leaflet wiring in one place.
  - Add `stopCoordinates`, `selectedTripKey`, and selected-trip map rendering.
- Create: `src/lib/fromSuggestions.js`
  - Pure helper for full-network alphabetical `From` suggestions plus exact-stop refinement suggestions.
- Create: `src/lib/routeMap.js`
  - Pure helper for deriving a selected trip segment and map/fallback state from one matched departure.
- Modify: `src/lib/query.js`
  - Return stable trip metadata with each matched direct trip so one clicked departure maps back to one exact trip segment.
- Modify: `src/ui/renderSearchForm.js`
  - Render grouped `From` panel sections: all areas plus optional exact-stop refinement.
- Modify: `src/ui/renderResults.js`
  - Render selectable departure cards and mount the selected-trip panel.
- Create: `src/ui/renderRouteMapPanel.js`
  - Render the selected trip details, intermediate stops, and map/fallback shell.
- Modify: `src/lib/i18n.js`
  - Add copy for full-network browsing, refinement hints, selectable departures, and map fallback states.
- Modify: `styles.css`
  - Make long `From` lists usable, selected departure cards obvious, and the map panel fit the existing visual language.
- Create: `tests/lib/fromSuggestions.test.js`
  - Unit coverage for alphabetical full-network browsing and refinement visibility.
- Modify: `tests/lib/query.test.js`
  - Verify stable trip metadata and segment stop slices.
- Create: `tests/lib/routeMap.test.js`
  - Verify coordinate-ready and coordinate-missing map states.
- Modify: `tests/ui/renderSearchForm.test.js`
  - Verify grouped `From` suggestions and network-wide copy.
- Modify: `tests/ui/renderResults.test.js`
  - Verify selectable departures and selected-trip panel mounting.
- Create: `tests/ui/renderRouteMapPanel.test.js`
  - Verify stop-by-stop panel rendering and fallback messaging.

### Task 1: Build Full-Network `From` Suggestions

**Files:**
- Create: `src/lib/fromSuggestions.js`
- Test: `tests/lib/fromSuggestions.test.js`
- Modify: `src/ui/renderSearchForm.js`
- Test: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Write the failing tests for alphabetical areas and exact-stop refinement**

```js
import { describe, expect, it } from 'vitest';
import { buildFromSuggestionSections } from '../../src/lib/fromSuggestions.js';

const localities = [
  { id: 'sanremo', label: 'Sanremo', aliases: ['Sanremo Autostazione'] },
  { id: 'andora', label: 'Andora', aliases: ['Andora Stazione FS'] },
  { id: 'porto-maurizio', label: 'Porto Maurizio', aliases: ['Imperia Porto Maurizio'] },
];

describe('buildFromSuggestionSections', () => {
  it('shows all localities alphabetically before the user types', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities,
      selectedLocalityLabel: '',
      exactStopChoices: [],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual([
      'Andora',
      'Porto Maurizio',
      'Sanremo',
    ]);
    expect(sections.exactStops).toEqual([]);
  });

  it('keeps area browsing available after a locality is selected and adds exact-stop refinement', () => {
    const sections = buildFromSuggestionSections({
      inputValue: 'porto',
      localities,
      selectedLocalityLabel: 'Porto Maurizio',
      exactStopChoices: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
        { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
      ],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual(['Porto Maurizio']);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'imperia porto maurizio',
      'imperia porto maurizio piazza dante',
    ]);
    expect(sections.exactStopHeading).toBe('Porto Maurizio');
  });
});
```

```js
it('renders a grouped from panel with all areas plus refinement choices', () => {
  const html = renderSearchForm({
    fromInput: 'porto',
    fromLocalitySelected: true,
    fromPanelOpen: true,
    fromSuggestions: {
      areas: [
        { value: 'Andora', meta: 'Area' },
        { value: 'Porto Maurizio', meta: 'Area' },
      ],
      exactStops: [
        { value: 'imperia porto maurizio', meta: 'Exact stop' },
      ],
      exactStopHeading: 'Porto Maurizio',
    },
  });

  expect(html).toContain('Browse all departure areas');
  expect(html).toContain('Refine within Porto Maurizio');
  expect(html.indexOf('Andora')).toBeLessThan(html.indexOf('Porto Maurizio'));
  expect(html).toContain('data-from-value="imperia porto maurizio"');
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- tests/lib/fromSuggestions.test.js tests/ui/renderSearchForm.test.js`

Expected: FAIL with `Cannot find module '../../src/lib/fromSuggestions.js'` and missing grouped-panel assertions in `renderSearchForm`.

- [ ] **Step 3: Write the minimal suggestion builder and grouped panel rendering**

```js
// src/lib/fromSuggestions.js
import { normalizeText } from './normalize.js';

function sortByLabel(entries) {
  return [...entries].sort((left, right) =>
    normalizeText(left.label ?? left.canonical).localeCompare(normalizeText(right.label ?? right.canonical)),
  );
}

export function buildFromSuggestionSections({
  inputValue,
  localities,
  selectedLocalityLabel,
  exactStopChoices,
}) {
  const query = normalizeText(inputValue);
  const matchingAreas = sortByLabel(localities)
    .filter((locality) => !query || normalizeText(locality.label).includes(query))
    .map((locality) => ({ value: locality.label, meta: 'Area' }));
  const matchingExactStops = sortByLabel(exactStopChoices)
    .filter((stop) => !query || normalizeText(stop.canonical).includes(query))
    .map((stop) => ({ value: stop.canonical, meta: 'Exact stop' }));

  return {
    areas: matchingAreas,
    exactStops: matchingExactStops,
    exactStopHeading: selectedLocalityLabel,
  };
}
```

```js
// renderSearchForm.js
function renderSuggestionButtons(attributeName, suggestions = [], t) {
  return suggestions
    .map(
      ({ value, meta = '' }) => `
        <button type="button" class="picker-option" ${attributeName}="${escapeHtml(value)}">
          <span class="picker-option-copy">
            <span class="picker-option-label">${escapeHtml(value)}</span>
            ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
          </span>
          <span class="picker-option-action" aria-hidden="true">${escapeHtml(t('search.panel.choose'))}</span>
        </button>
      `,
    )
    .join('');
}

function renderFromPanel({ fromSuggestions, t }) {
  const { areas = [], exactStops = [], exactStopHeading = '' } = fromSuggestions;

  return `
    <div class="picker-panel" data-panel="from">
      <div class="picker-panel-head">
        <div class="picker-panel-copy">${escapeHtml(t('search.fromPanel.browseAll'))}</div>
      </div>
      <div class="picker-option-list">
        ${renderSuggestionButtons('data-from-value', areas, t)}
      </div>
      ${exactStops.length ? `
        <div class="picker-panel-head">
          <div class="picker-panel-copy">${escapeHtml(t('search.fromPanel.refineWithin', { locality: exactStopHeading }))}</div>
        </div>
        <div class="picker-option-list">
          ${renderSuggestionButtons('data-from-value', exactStops, t)}
        </div>
      ` : ''}
    </div>
  `;
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- tests/lib/fromSuggestions.test.js tests/ui/renderSearchForm.test.js`

Expected: PASS for the new suggestion helper and grouped `From` panel assertions.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/fromSuggestions.test.js tests/ui/renderSearchForm.test.js src/lib/fromSuggestions.js src/ui/renderSearchForm.js
git commit -m "feat: add network-wide from suggestions"
```

### Task 2: Return Trip Metadata Needed For One Selected Departure

**Files:**
- Modify: `src/lib/query.js`
- Test: `tests/lib/query.test.js`

- [ ] **Step 1: Write the failing tests for stable trip metadata and segment stops**

```js
it('returns stable trip metadata and the matched stop segment for each direct trip', () => {
  const matches = findDirectTrips({
    fromStopId: 'imperia-porto-maurizio',
    toStopId: 'sanremo-autostazione',
    dayType: 'feriale',
    aliases,
    trips: [
      {
        lineId: '12',
        direction: 'ANDORA - SANREMO',
        dayType: 'feriale',
        sourcePage: 22,
        stops: [
          { stopId: 'andora-stazione-fs', name: 'andora stazione fs', time: '05:35' },
          { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
          { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
          { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
        ],
      },
    ],
  });

  expect(matches[0]).toMatchObject({
    tripKey: '12:feriale:22:0:imperia-porto-maurizio:sanremo-autostazione',
    direction: 'ANDORA - SANREMO',
    fromIndex: 1,
    toIndex: 3,
  });
  expect(matches[0].segmentStops.map((stop) => stop.stopId)).toEqual([
    'imperia-porto-maurizio',
    'taggia-stazione',
    'sanremo-autostazione',
  ]);
});
```

- [ ] **Step 2: Run the query tests to verify they fail**

Run: `npm test -- tests/lib/query.test.js`

Expected: FAIL because `tripKey`, `fromIndex`, `toIndex`, and `segmentStops` are not present on the returned match records.

- [ ] **Step 3: Extend the direct-trip matches with stable selection metadata**

```js
// query.js
export function findDirectTrips({ from, to, fromStopId, fromLocalityStopIds = [], toStopId, dayType, aliases, trips }) {
  const resolvedOriginStopIds = fromStopId
    ? [fromStopId]
    : fromLocalityStopIds.length
      ? fromLocalityStopIds
      : [stopIdFromName(canonicalizeStopName(from, aliases))];
  const resolvedToStopId = toStopId ?? stopIdFromName(canonicalizeStopName(to, aliases));

  return trips
    .filter((trip) => trip.dayType === dayType)
    .flatMap((trip, tripIndex) =>
      resolvedOriginStopIds.map((originStopId) => {
        const fromIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === originStopId);
        const toIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === resolvedToStopId);

        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
          return null;
        }

        return {
          tripKey: `${trip.lineId}:${trip.dayType}:${trip.sourcePage}:${tripIndex}:${originStopId}:${resolvedToStopId}`,
          lineId: trip.lineId,
          direction: trip.direction,
          sourcePage: trip.sourcePage,
          fromStopId: originStopId,
          toStopId: resolvedToStopId,
          fromIndex,
          toIndex,
          departureTime: trip.stops[fromIndex].time,
          arrivalTime: trip.stops[toIndex].time,
          durationMinutes: durationBetween(trip.stops[fromIndex].time, trip.stops[toIndex].time),
          segmentStops: trip.stops.slice(fromIndex, toIndex + 1),
        };
      }),
    )
    .filter(Boolean)
    .sort((left, right) => toMinutes(left.departureTime) - toMinutes(right.departureTime));
}
```

- [ ] **Step 4: Run the query tests to verify they pass**

Run: `npm test -- tests/lib/query.test.js`

Expected: PASS with direct-trip summaries still green and the new segment metadata assertions passing.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/query.test.js src/lib/query.js
git commit -m "feat: expose selected trip metadata"
```

### Task 3: Add Pure Route-Map State With Graceful Fallback

**Files:**
- Create: `src/lib/routeMap.js`
- Test: `tests/lib/routeMap.test.js`

- [ ] **Step 1: Write the failing tests for coordinate-ready and coordinate-missing states**

```js
import { describe, expect, it } from 'vitest';
import { buildRouteMapState } from '../../src/lib/routeMap.js';

describe('buildRouteMapState', () => {
  it('returns map points when every segment stop has coordinates', () => {
    const state = buildRouteMapState({
      lineId: '12',
      segmentStops: [
        { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
        { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
      ],
    }, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
    });

    expect(state.hasMap).toBe(true);
    expect(state.points).toEqual([
      { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20', latitude: 43.886, longitude: 8.029 },
      { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45', latitude: 43.846, longitude: 7.852 },
    ]);
  });

  it('returns a fallback state when any segment stop is missing coordinates', () => {
    const state = buildRouteMapState({
      lineId: '12',
      segmentStops: [
        { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
        { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
      ],
    }, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
    });

    expect(state.hasMap).toBe(false);
    expect(state.missingStopIds).toEqual(['taggia-stazione']);
    expect(state.stops).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the route-map tests to verify they fail**

Run: `npm test -- tests/lib/routeMap.test.js`

Expected: FAIL with `Cannot find module '../../src/lib/routeMap.js'`.

- [ ] **Step 3: Write the minimal route-map state builder**

```js
// src/lib/routeMap.js
export function buildRouteMapState(match, stopCoordinates = {}) {
  const stops = match.segmentStops.map((stop) => ({
    stopId: stop.stopId,
    label: stop.name,
    time: stop.time,
  }));
  const points = stops
    .map((stop) => {
      const coords = stopCoordinates[stop.stopId];
      return coords
        ? { ...stop, latitude: coords.latitude, longitude: coords.longitude }
        : null;
    })
    .filter(Boolean);
  const missingStopIds = stops
    .filter((stop) => !stopCoordinates[stop.stopId])
    .map((stop) => stop.stopId);

  return {
    hasMap: missingStopIds.length === 0 && points.length >= 2,
    stops,
    points,
    missingStopIds,
  };
}
```

- [ ] **Step 4: Run the route-map tests to verify they pass**

Run: `npm test -- tests/lib/routeMap.test.js`

Expected: PASS with both the coordinate-ready and coordinate-missing branches covered.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/routeMap.test.js src/lib/routeMap.js
git commit -m "feat: add route map fallback state"
```

### Task 4: Render Selectable Departures And The Selected-Trip Panel

**Files:**
- Create: `src/ui/renderRouteMapPanel.js`
- Test: `tests/ui/renderRouteMapPanel.test.js`
- Modify: `src/ui/renderResults.js`
- Test: `tests/ui/renderResults.test.js`

- [ ] **Step 1: Write the failing UI tests for selectable departure cards and fallback panel copy**

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderRouteMapPanel } from '../../src/ui/renderRouteMapPanel.js';

describe('renderRouteMapPanel', () => {
  it('renders the selected trip stop list and fallback message when map data is unavailable', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match: {
        lineId: '12',
        direction: 'ANDORA - SANREMO',
        departureTime: '06:20',
        arrivalTime: '07:00',
      },
      mapState: {
        hasMap: false,
        stops: [
          { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20' },
          { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45' },
          { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00' },
        ],
      },
    });

    expect(html).toContain('Selected trip map');
    expect(html).toContain('Map unavailable for this trip');
    expect(html).toContain('taggia stazione');
  });
});
```

```js
it('renders selectable departure cards and the selected trip panel', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    summary: {
      averageDurationMinutes: 39,
      firstDeparture: '06:20',
      lastDeparture: '19:45',
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [
      {
        tripKey: '12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione',
        departureTime: '06:20',
        arrivalTime: '07:00',
        durationMinutes: 40,
        lineId: '12',
        sourcePage: 23,
      },
    ],
    selectedTripKey: '12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione',
    selectedTripPanel: '<section data-testid="route-map-panel">panel</section>',
  });

  expect(html).toContain('data-trip-key="12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione"');
  expect(html).toContain('departure-card departure-card--selected');
  expect(html).toContain('data-testid="route-map-panel"');
});
```

- [ ] **Step 2: Run the result UI tests to verify they fail**

Run: `npm test -- tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js`

Expected: FAIL with `Cannot find module '../../src/ui/renderRouteMapPanel.js'` and missing `data-trip-key` / selected-card assertions.

- [ ] **Step 3: Add the selected-trip panel renderer and selectable departure markup**

```js
// src/ui/renderRouteMapPanel.js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderRouteMapPanel({ t = createTranslator('en'), match, mapState }) {
  return `
    <section class="route-map-panel" data-testid="route-map-panel">
      <div class="section-head">
        <h3>${escapeHtml(t('results.selectedTripMap'))}</h3>
        <p>${escapeHtml(t('results.selectedTripMapSubtitle'))}</p>
      </div>
      <div class="route-map-meta">
        <strong>${escapeHtml(t('results.line'))} ${escapeHtml(match.lineId)}</strong>
        <span>${escapeHtml(match.departureTime)} → ${escapeHtml(match.arrivalTime)}</span>
      </div>
      <div id="selected-trip-map" class="location-map">
        ${mapState.hasMap ? '' : escapeHtml(t('results.mapUnavailable'))}
      </div>
      <ol class="route-stop-list">
        ${mapState.stops.map((stop) => `<li>${escapeHtml(stop.time)} · ${escapeHtml(stop.label)}</li>`).join('')}
      </ol>
    </section>
  `;
}
```

```js
// renderResults.js
function renderDepartureCard(departure, t, selectedTripKey) {
  const className = departure.tripKey === selectedTripKey
    ? 'departure-card departure-card--selected'
    : 'departure-card';

  return `
    <button type="button" class="${className}" data-trip-key="${departure.tripKey}">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <span>${t('results.showTripMap')}</span>
      </div>
    </button>
  `;
}

export function renderResultsView({ t = createTranslator('en'), routeLabel, summary, nextDepartures, allDepartures, selectedTripKey = null, selectedTripPanel = '' }) {
  return `
    <section class="results-shell">
      <!-- existing summary -->
      <section class="results-section">
        <div class="departure-list">
          ${allDepartures.map((departure) => renderDepartureCard(departure, t, selectedTripKey)).join('')}
        </div>
      </section>
      ${selectedTripPanel}
    </section>
  `;
}
```

- [ ] **Step 4: Run the result UI tests to verify they pass**

Run: `npm test -- tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js`

Expected: PASS with selected-card markup and fallback panel rendering covered.

- [ ] **Step 5: Commit**

```bash
git add tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js src/ui/renderResults.js src/ui/renderRouteMapPanel.js
git commit -m "feat: render selectable trip map panel"
```

### Task 5: Wire The New Search And Map Flow Through `main.js`

**Files:**
- Modify: `src/main.js`
- Modify: `src/ui/renderSearchForm.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/lib/i18n.js`

- [ ] **Step 1: Write the failing UI tests for the new copy hooks and full-network placeholders**

```js
it('renders network-wide search copy instead of corridor-specific placeholders', () => {
  const html = renderSearchForm({
    t: createTranslator('en'),
    fromSuggestions: { areas: [], exactStops: [], exactStopHeading: '' },
  });

  expect(html).toContain('Browse all departure areas');
  expect(html).toContain('Choose departure area');
  expect(html).not.toContain('placeholder="Porto Maurizio"');
});
```

```js
it('renders selected-trip action copy in translated results', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Andora -> Sanremo',
    summary: {
      averageDurationMinutes: 39,
      firstDeparture: '06:20',
      lastDeparture: '19:45',
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [
      {
        tripKey: '12:feriale:23:0:andora-stazione-fs:sanremo-autostazione',
        departureTime: '06:20',
        arrivalTime: '07:00',
        durationMinutes: 40,
        lineId: '12',
        sourcePage: 23,
      },
    ],
  });

  expect(html).toContain('Show trip on map');
});
```

- [ ] **Step 2: Run the focused UI tests to verify they fail**

Run: `npm test -- tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js`

Expected: FAIL because the copy keys and generic placeholder text do not exist yet.

- [ ] **Step 3: Wire grouped `From` suggestions, selected-trip state, and optional coordinate loading**

```js
// main.js state
const state = {
  trips: [],
  stops: [],
  stopCoordinates: {},
  // ...
  resultState: null,
};
```

```js
// main.js suggestion flow
import { buildFromSuggestionSections } from './lib/fromSuggestions.js';
import { buildRouteMapState } from './lib/routeMap.js';
import { renderRouteMapPanel } from './ui/renderRouteMapPanel.js';

function currentFromSuggestions() {
  return buildFromSuggestionSections({
    inputValue: state.formValues.fromInput,
    localities: state.localities,
    selectedLocalityLabel: state.localities.find((entry) => entry.id === state.formValues.fromLocalityId)?.label ?? '',
    exactStopChoices: state.pickerState.exactStopChoices,
  });
}
```

```js
// main.js result submission
state.resultState = {
  type: 'results',
  summary: buildRouteSummary(matches),
  nextDepartures: nextDepartures(matches),
  allDepartures: matches,
  selectedTripKey: null,
  selectedTripPanel: '',
};
```

```js
// main.js departure selection
function renderSelectedTrip(match) {
  const mapState = buildRouteMapState(match, state.stopCoordinates);
  state.resultState = {
    ...state.resultState,
    selectedTripKey: match.tripKey,
    selectedTripPanel: renderRouteMapPanel({
      t: createTranslator(state.language),
      match,
      mapState,
    }),
  };
}

function bindDepartureSelection() {
  document.querySelectorAll('[data-trip-key]').forEach((button) => {
    button.addEventListener('click', async () => {
      const match = state.resultState?.allDepartures.find((entry) => entry.tripKey === button.dataset.tripKey);
      if (!match) {
        return;
      }

      renderSelectedTrip(match);
      renderApp();
      bindInteractions();
      if (buildRouteMapState(match, state.stopCoordinates).hasMap) {
        await renderSelectedTripMap(buildRouteMapState(match, state.stopCoordinates));
      }
    });
  });
}
```

```js
// main.js boot
const [trips, stops, stopCoordinates, generatedLocalities, generatedReachability, manualLocalities] = await Promise.all([
  fetch('./assets/data/trips.json').then((response) => response.json()),
  fetch('./assets/data/stops.json').then((response) => response.json()),
  fetchJsonOrNull('./assets/data/stop-coordinates.json'),
  fetchJsonOrNull('./assets/data/localities.json'),
  fetchJsonOrNull('./assets/data/reachability.json'),
  fetchJsonOrNull('./data/manual/localities.json'),
]);

state.stopCoordinates = stopCoordinates ?? {};
```

```js
// main.js selected-trip map
async function renderSelectedTripMap(mapState) {
  if (!mapState.hasMap) {
    return;
  }

  const mapElement = document.querySelector('#selected-trip-map');
  if (!mapElement || mapElement._leaflet_id) {
    return;
  }

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
    color: '#1144cc',
    weight: 4,
  }).addTo(map);

  mapState.points.forEach((point) => {
    L.marker([point.latitude, point.longitude]).addTo(map).bindPopup(`${point.time} · ${point.label}`);
  });

  map.fitBounds(coordinates, { padding: [24, 24] });
}
```

- [ ] **Step 4: Run the focused UI tests to verify they pass**

Run: `npm test -- tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js`

Expected: PASS with generic browse copy and selected-trip action copy present.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/ui/renderSearchForm.js src/ui/renderResults.js src/lib/i18n.js
git commit -m "feat: wire selected trip map flow"
```

### Task 6: Polish Copy, Styles, And Run The Relevant Suite

**Files:**
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`
- Run: `tests/lib/fromSuggestions.test.js`
- Run: `tests/lib/query.test.js`
- Run: `tests/lib/routeMap.test.js`
- Run: `tests/ui/renderSearchForm.test.js`
- Run: `tests/ui/renderResults.test.js`
- Run: `tests/ui/renderRouteMapPanel.test.js`

- [ ] **Step 1: Add the final translation keys and the selected-card / map-panel styles**

```js
// i18n.js (English keys shown; mirror across supported languages)
'search.fromPlaceholder': 'Choose departure area',
'search.fromPanel.browseAll': 'Browse all departure areas',
'search.fromPanel.refineWithin': 'Refine within {locality}',
'results.showTripMap': 'Show trip on map',
'results.selectedTripMap': 'Selected trip map',
'results.selectedTripMapSubtitle': 'The exact direct trip segment you selected',
'results.mapUnavailable': 'Map unavailable for this trip',
```

```css
/* styles.css */
.picker-option-list {
  max-height: 18rem;
  overflow-y: auto;
}

.departure-card {
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.departure-card--selected {
  border-color: #1144cc;
  box-shadow: 0 0 0 1px rgba(17, 68, 204, 0.2);
}

.route-map-panel {
  display: grid;
  gap: 1rem;
}

.route-stop-list {
  margin: 0;
  padding-left: 1.25rem;
}
```

- [ ] **Step 2: Run the relevant test suite**

Run: `npm test -- tests/lib/fromSuggestions.test.js tests/lib/query.test.js tests/lib/routeMap.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js`

Expected: PASS across the targeted library and UI coverage for the new search and route-map behavior.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: PASS with the existing route-picker, parsing, and i18n coverage still green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.js styles.css tests/lib/fromSuggestions.test.js tests/lib/query.test.js tests/lib/routeMap.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderRouteMapPanel.test.js
git commit -m "feat: polish network route map experience"
```
