# Riviera Route Picker Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Riviera Trasporti route picker into a compact blank-state search card with immediate area suggestions on `From`, a soft-gated `To` panel, and exact-stop destination narrowing.

**Architecture:** Keep the existing locality-aware direct-trip model, but finish the missing locality-wide destination behavior and replace the current datalist-driven form with explicit picker panels rendered by `renderSearchForm` and coordinated by `src/main.js`. Preserve the current module boundaries: pure data/state helpers stay in `src/lib/*`, DOM rendering stays in `src/ui/*`, and only `src/main.js` owns interaction wiring and transient open/closed UI state.

**Tech Stack:** Vanilla JavaScript modules, HTML templates, CSS, `vitest`

---

## File Map

- `src/lib/localities.js`: locality lookup plus locality-wide reachable-destination derivation.
- `src/lib/query.js`: direct-trip search from either one exact origin stop or a selected origin locality.
- `src/lib/routePickerState.js`: pure transitions for broad locality selection, exact-stop refinement, and destination resets.
- `src/main.js`: app state, custom picker-panel open/close logic, filtering, and submit handling.
- `src/ui/renderSearchForm.js`: compact search-card markup, custom `From`/`To` panels, and state-specific helper copy.
- `src/ui/renderLocationPicker.js`: nearby-stop copy aligned with the new blank-state search model.
- `styles.css`: warmer compact card styling and picker-panel states.
- `tests/lib/localities.test.js`: locality-wide destination helper coverage.
- `tests/lib/query.test.js`: broad-origin query coverage.
- `tests/lib/routePickerState.test.js`: origin and destination transition coverage.
- `tests/ui/renderSearchForm.test.js`: blank-state form and panel rendering coverage.

### Task 1: Finish locality-wide destination and broad-origin query support

**Files:**
- Modify: `src/lib/localities.js`
- Modify: `src/lib/query.js`
- Modify: `tests/lib/localities.test.js`
- Modify: `tests/lib/query.test.js`

- [ ] **Step 1: Write the failing helper and query tests**

```js
// tests/lib/localities.test.js
import {
  findExactLocalityMatch,
  findExactStopMatch,
  findMatchingLocalities,
  getLocalityReachableStops,
  getLocalityStops,
  getReachableStops,
} from '../../src/lib/localities.js';

it('builds a locality-wide destination union from every stop in the locality', () => {
  expect(
    getLocalityReachableStops(
      'porto-maurizio',
      localities,
      {
        'imperia-porto-maurizio': ['sanremo-autostazione', 'taggia-stazione'],
        'imperia-porto-maurizio-piazza-dante': ['sanremo-autostazione'],
      },
      stops,
    ),
  ).toEqual([
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
    { id: 'taggia-stazione', canonical: 'taggia stazione' },
  ]);
});
```

```js
// tests/lib/query.test.js
it('searches across every stop in the selected locality when no exact origin stop exists', () => {
  const matches = findDirectTrips({
    from: 'Porto Maurizio',
    fromLocalityStopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
    toStopId: 'sanremo-autostazione',
    dayType: 'feriale',
    aliases,
    trips: [
      ...trips,
      {
        lineId: '13',
        dayType: 'feriale',
        sourcePage: 24,
        stops: [
          { stopId: 'imperia-porto-maurizio-piazza-dante', name: 'imperia porto maurizio piazza dante', time: '06:15' },
          { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:05' },
        ],
      },
    ],
  });

  expect(matches).toHaveLength(3);
  expect(matches.map((match) => match.fromStopId)).toEqual([
    'imperia-porto-maurizio-piazza-dante',
    'imperia-porto-maurizio',
    'imperia-porto-maurizio',
  ]);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js`
Expected: FAIL because `getLocalityReachableStops` does not exist and `findDirectTrips` only resolves one origin stop.

- [ ] **Step 3: Write the minimal helper and query implementation**

```js
// src/lib/localities.js
export function getLocalityReachableStops(localityId, localities, reachability, stops) {
  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  const localityStops = getLocalityStops(localityId, localities, stops);
  const destinationIds = new Set();

  for (const stop of localityStops) {
    for (const destinationId of reachability[stop.id] ?? []) {
      destinationIds.add(destinationId);
    }
  }

  return [...destinationIds]
    .sort()
    .map((stopId) => stopMap.get(stopId))
    .filter(Boolean);
}
```

```js
// src/lib/query.js
export function findDirectTrips({ from, to, fromStopId, fromLocalityStopIds = [], toStopId, dayType, aliases, trips }) {
  const resolvedOriginStopIds = fromStopId
    ? [fromStopId]
    : fromLocalityStopIds.length
      ? fromLocalityStopIds
      : [stopIdFromName(canonicalizeStopName(from, aliases))];
  const resolvedToStopId = toStopId ?? stopIdFromName(canonicalizeStopName(to, aliases));

  return trips
    .filter((trip) => trip.dayType === dayType)
    .flatMap((trip) =>
      resolvedOriginStopIds.map((originStopId) => {
        const fromIndex = trip.stops.findIndex(
          (stop) => (stop.stopId ?? stopIdFromName(stop.name)) === originStopId,
        );
        const toIndex = trip.stops.findIndex(
          (stop) => (stop.stopId ?? stopIdFromName(stop.name)) === resolvedToStopId,
        );

        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
          return null;
        }

        return {
          lineId: trip.lineId,
          sourcePage: trip.sourcePage,
          fromStopId: originStopId,
          toStopId: resolvedToStopId,
          departureTime: trip.stops[fromIndex].time,
          arrivalTime: trip.stops[toIndex].time,
          durationMinutes: durationBetween(trip.stops[fromIndex].time, trip.stops[toIndex].time),
        };
      }),
    )
    .filter(Boolean)
    .sort((left, right) => toMinutes(left.departureTime) - toMinutes(right.departureTime));
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/localities.test.js tests/lib/query.test.js src/lib/localities.js src/lib/query.js
git commit -m "feat: support locality-wide route picker destinations"
```

### Task 2: Update pure route-picker state for blank entry and narrowing

**Files:**
- Modify: `src/lib/routePickerState.js`
- Modify: `tests/lib/routePickerState.test.js`

- [ ] **Step 1: Write the failing state-transition tests**

```js
// tests/lib/routePickerState.test.js
it('unlocks locality-wide destinations as soon as a broad area is selected', () => {
  const nextState = selectLocality(
    {
      formValues: {
        fromInput: '',
        fromLocalityId: null,
        fromStopId: null,
        toInput: '',
        toStopId: null,
      },
      pickerState: { exactStopChoices: [], reachableDestinations: [] },
    },
    { id: 'porto-maurizio', label: 'Porto Maurizio', stopIds: ['imperia-porto-maurizio'] },
    [{ id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' }],
    { 'imperia-porto-maurizio': ['sanremo-autostazione'] },
    [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
  );

  expect(nextState.formValues.fromInput).toBe('Porto Maurizio');
  expect(nextState.pickerState.reachableDestinations).toEqual([
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  ]);
});

it('replaces the broad area label with the exact stop name when refinement is chosen', () => {
  const nextState = selectOriginStop(
    {
      formValues: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: 'porto-maurizio',
        fromStopId: null,
        toInput: 'sanremo autostazione',
        toStopId: 'sanremo-autostazione',
      },
      pickerState: {
        exactStopChoices: [{ id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' }],
        reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
      },
    },
    { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
    { 'imperia-porto-maurizio': ['taggia-stazione'] },
    [{ id: 'taggia-stazione', canonical: 'taggia stazione' }],
  );

  expect(nextState.formValues.fromInput).toBe('imperia porto maurizio');
  expect(nextState.formValues.toInput).toBe('');
  expect(nextState.formValues.toStopId).toBeNull();
  expect(nextState.pickerState.reachableDestinations).toEqual([
    { id: 'taggia-stazione', canonical: 'taggia stazione' },
  ]);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/lib/routePickerState.test.js`
Expected: FAIL because `selectLocality` still clears `reachableDestinations` instead of hydrating the locality-wide union.

- [ ] **Step 3: Write the minimal state implementation**

```js
// src/lib/routePickerState.js
import { getLocalityReachableStops, getLocalityStops, getReachableStops } from './localities.js';

export function selectLocality(state, locality, stops, reachability) {
  return {
    ...state,
    formValues: {
      ...state.formValues,
      fromInput: locality.label,
      fromLocalityId: locality.id,
      fromStopId: null,
      toInput: '',
      toStopId: null,
    },
    pickerState: {
      ...state.pickerState,
      exactStopChoices: getLocalityStops(locality.id, [locality], stops),
      reachableDestinations: getLocalityReachableStops(locality.id, [locality], reachability, stops),
    },
  };
}

export function selectOriginStop(state, stop, reachability, stops) {
  return {
    ...state,
    formValues: {
      ...state.formValues,
      fromInput: stop.canonical,
      fromStopId: stop.id,
      toInput: '',
      toStopId: null,
    },
    pickerState: {
      ...state.pickerState,
      reachableDestinations: getReachableStops(stop.id, reachability, stops),
    },
  };
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/lib/routePickerState.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/routePickerState.test.js src/lib/routePickerState.js
git commit -m "feat: update route picker state transitions"
```

### Task 3: Replace datalist markup with explicit form panels and blank-state rendering

**Files:**
- Modify: `src/ui/renderSearchForm.js`
- Modify: `src/ui/renderLocationPicker.js`
- Modify: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Write the failing UI rendering tests**

```js
// tests/ui/renderSearchForm.test.js
it('renders a blank initial form with a focusable but informational to field', () => {
  const html = renderSearchForm({
    fromInput: '',
    fromPanelOpen: true,
    fromSuggestions: [
      { value: 'Porto Maurizio', meta: 'Area' },
      { value: 'Sanremo', meta: 'Area' },
    ],
    toInput: '',
    toPanelOpen: true,
    destinationMode: 'informational',
    destinationMessage: 'Choose a departure area first to see direct destinations.',
    reachableDestinations: [],
  });

  expect(html).toContain('placeholder="Porto Maurizio"');
  expect(html).toContain('data-panel="from"');
  expect(html).toContain('Porto Maurizio');
  expect(html).toContain('Sanremo');
  expect(html).toContain('data-panel="to"');
  expect(html).not.toContain('disabled');
  expect(html).toContain('Choose a departure area first to see direct destinations.');
});

it('renders exact destinations once an origin area has been selected', () => {
  const html = renderSearchForm({
    fromInput: 'Porto Maurizio',
    fromPanelOpen: false,
    toInput: '',
    toPanelOpen: true,
    destinationMode: 'locality-destinations',
    destinationMessage: 'Direct destinations from this area',
    reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
  });

  expect(html).toContain('Direct destinations from this area');
  expect(html).toContain('data-stop-id="sanremo-autostazione"');
});

it('shows the exact stop name with no remaining broad-area helper after refinement', () => {
  const html = renderSearchForm({
    fromInput: 'imperia porto maurizio',
    exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
    fromPanelOpen: false,
    toInput: '',
    toPanelOpen: false,
    destinationMode: 'exact-stop-destinations',
    destinationMessage: 'Direct destinations from this stop',
    reachableDestinations: [],
  });

  expect(html).toContain('value="imperia porto maurizio"');
  expect(html).not.toContain('Exact stop confirmed in Porto Maurizio');
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/ui/renderSearchForm.test.js`
Expected: FAIL because the current renderer still uses datalists, seeded defaults, and a disabled `To` field.

- [ ] **Step 3: Write the minimal rendering implementation**

```js
// src/ui/renderSearchForm.js
function renderSuggestionButtons(suggestions = []) {
  return suggestions
    .map(
      ({ value, meta = '' }) => `
        <button type="button" class="picker-option" data-from-value="${value}">
          <span>${value}</span>
          ${meta ? `<small>${meta}</small>` : ''}
        </button>
      `,
    )
    .join('');
}

function renderDestinationPanel({ destinationMode, destinationMessage, reachableDestinations }) {
  if (destinationMode === 'informational' || destinationMode === 'empty') {
    return `<div class="picker-panel-copy">${destinationMessage}</div>`;
  }

  return `
    <div class="picker-panel-copy">${destinationMessage}</div>
    <div class="picker-option-list">
      ${reachableDestinations
        .map(
          (stop) => `
            <button type="button" class="picker-option" data-stop-id="${stop.id}" data-to-value="${stop.canonical}">
              <span>${stop.canonical}</span>
            </button>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderSearchForm({
  from = '',
  to = '',
  fromInput = from,
  exactFromStop = null,
  fromSuggestions = [],
  fromPanelOpen = false,
  toInput = to,
  toPanelOpen = false,
  reachableDestinations = [],
  destinationMode = 'informational',
  destinationMessage = 'Choose a departure area first to see direct destinations.',
  dayType = 'feriale',
} = {}) {
  const fromHelp = exactFromStop
    ? 'Exact departure stop selected.'
    : 'Start with an area, then refine to the exact stop if needed.';

  return `
    <section class="hero-shell hero-shell--compact">
      <div class="hero-copy">
        <p class="eyebrow">Riviera Trasporti Search</p>
        <h1>Find direct Riviera buses faster than scanning the PDF.</h1>
        <p class="hero-text">Choose a departure area, narrow to the exact stop, then browse only direct destinations.</p>
      </div>

      <form id="route-form" class="search-form search-form--capsule">
        <label class="field">
          <span>Da / From</span>
          <div class="field-input-row">
            <input name="from" value="${fromInput}" placeholder="Porto Maurizio" autocomplete="off" data-field="from" />
            ${renderLocationButton('from')}
          </div>
          <small>${fromHelp}</small>
          ${fromPanelOpen ? `<div class="picker-panel" data-panel="from">${renderSuggestionButtons(fromSuggestions)}</div>` : ''}
        </label>

        <label class="field">
          <span>A / To</span>
          <div class="field-input-row">
            <input name="to" value="${toInput}" placeholder="Choose direct destination" autocomplete="off" data-field="to" />
            ${renderLocationButton('to')}
          </div>
          <small>Only direct destinations appear here.</small>
          ${toPanelOpen ? `<div class="picker-panel" data-panel="to">${renderDestinationPanel({ destinationMode, destinationMessage, reachableDestinations })}</div>` : ''}
        </label>
      </form>
    </section>
  `;
}
```

```js
// src/ui/renderLocationPicker.js
<p>Choose an area first, then confirm the exact timetable stop if the nearby match is ambiguous.</p>
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/ui/renderSearchForm.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/ui/renderSearchForm.test.js src/ui/renderSearchForm.js src/ui/renderLocationPicker.js
git commit -m "feat: render compact route picker panels"
```

### Task 4: Wire picker interactions in `main.js` and apply the visual restyle

**Files:**
- Modify: `src/main.js`
- Modify: `styles.css`
- Verify with: `tests/lib/localities.test.js`
- Verify with: `tests/lib/query.test.js`
- Verify with: `tests/lib/routePickerState.test.js`
- Verify with: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Write the failing interaction-oriented render test**

```js
// tests/ui/renderSearchForm.test.js
it('renders the informational to panel without disabling the input before origin selection', () => {
  const html = renderSearchForm({
    fromInput: '',
    fromPanelOpen: false,
    toInput: '',
    toPanelOpen: true,
    destinationMode: 'informational',
    destinationMessage: 'Choose a departure area first to see direct destinations.',
    reachableDestinations: [],
  });

  expect(html).toContain('data-panel="to"');
  expect(html).not.toContain('name="to"\n              disabled');
});
```

Even if this test already passes after Task 3, keep it as the guardrail for the `main.js` wiring work.

- [ ] **Step 2: Run the targeted UI test to verify the guardrail stays meaningful**

Run: `npm test -- tests/ui/renderSearchForm.test.js`
Expected: PASS, giving a stable render guard before wiring interactions.

- [ ] **Step 3: Write the minimal interaction and styling implementation**

```js
// src/main.js
const state = {
  trips: [],
  stops: [],
  localities: [],
  reachability: {},
  aliases: {},
  uiState: {
    fromPanelOpen: false,
    toPanelOpen: false,
  },
  formValues: {
    fromInput: '',
    fromLocalityId: null,
    fromStopId: null,
    toInput: '',
    toStopId: null,
    dayType: 'feriale',
  },
  pickerState: {
    exactStopChoices: [],
    reachableDestinations: [],
  },
  resultState: null,
  locationPicker: null,
};

function currentFromSuggestions() {
  if (state.formValues.fromLocalityId && !state.formValues.fromStopId) {
    return state.pickerState.exactStopChoices.map((stop) => ({ value: stop.canonical, meta: 'Exact stop' }));
  }

  return state.localities.map((locality) => ({ value: locality.label, meta: 'Area' }));
}

function currentDestinationMode() {
  if (!state.formValues.fromLocalityId) {
    return 'informational';
  }

  if (state.pickerState.reachableDestinations.length === 0) {
    return 'empty';
  }

  return state.formValues.fromStopId ? 'exact-stop-destinations' : 'locality-destinations';
}

function currentDestinationMessage() {
  const mode = currentDestinationMode();

  if (mode === 'informational') {
    return 'Choose a departure area first to see direct destinations.';
  }

  if (mode === 'empty') {
    return state.formValues.fromStopId
      ? 'No direct destinations found from this exact stop for the selected day type.'
      : 'No direct destinations found from this area for the selected day type.';
  }

  return state.formValues.fromStopId
    ? 'Direct destinations from this stop'
    : 'Direct destinations from this area';
}

function bindFieldPanels() {
  const fromInput = document.querySelector('[data-field="from"]');
  const toInput = document.querySelector('[data-field="to"]');

  fromInput?.addEventListener('focus', () => {
    state.uiState.fromPanelOpen = true;
    state.uiState.toPanelOpen = false;
    renderApp();
    bindInteractions();
  });

  toInput?.addEventListener('focus', () => {
    state.uiState.fromPanelOpen = false;
    state.uiState.toPanelOpen = true;
    renderApp();
    bindInteractions();
  });

  document.querySelectorAll('[data-from-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const locality = findExactLocalityMatch(button.dataset.fromValue, state.localities);
      const stop = findExactStopMatch(button.dataset.fromValue, state.stops);

      if (locality) {
        Object.assign(state, selectLocality(state, locality, state.stops, state.reachability));
        state.uiState.fromPanelOpen = true;
      } else if (stop) {
        Object.assign(state, selectOriginStop(state, stop, state.reachability, state.stops));
        state.uiState.fromPanelOpen = false;
        state.uiState.toPanelOpen = true;
      }

      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-to-value]').forEach((button) => {
    button.addEventListener('click', () => {
      state.formValues = {
        ...state.formValues,
        toInput: button.dataset.toValue,
        toStopId: button.dataset.stopId,
      };
      state.uiState.toPanelOpen = false;
      renderApp();
      bindInteractions();
    });
  });
}
```

```js
// src/main.js inside renderApp()
const parts = [renderSearchForm({
  fromInput: state.formValues.fromInput,
  exactFromStop,
  fromSuggestions: currentFromSuggestions(),
  fromPanelOpen: state.uiState.fromPanelOpen,
  toInput: state.formValues.toInput,
  toPanelOpen: state.uiState.toPanelOpen,
  reachableDestinations: state.pickerState.reachableDestinations,
  destinationMode: currentDestinationMode(),
  destinationMessage: currentDestinationMessage(),
  dayType: state.formValues.dayType,
})];
```

```css
/* styles.css */
:root {
  --bg-top: #f7f1ea;
  --bg-bottom: #efe4d6;
  --panel: rgba(255, 255, 255, 0.9);
  --panel-strong: #ffffff;
  --line: rgba(62, 39, 24, 0.12);
  --text: #1d1a17;
  --muted: #6b6258;
  --accent: #eb4c60;
  --accent-strong: #d93b4f;
  --signal: #ff8a3d;
  --shadow: 0 30px 60px rgba(93, 63, 35, 0.12);
}

body {
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(235, 76, 96, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(255, 138, 61, 0.08), transparent 22%),
    linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
}

.hero-shell--compact {
  grid-template-columns: 0.9fr 1.1fr;
  align-items: start;
}

.search-form--capsule {
  gap: 16px;
  padding: 20px;
  border-radius: 28px;
  background: var(--panel-strong);
}

.hero-copy h1 {
  font-size: clamp(2.1rem, 5vw, 3.8rem);
  line-height: 0.98;
}

.field input,
.field select,
.search-form button,
.field-location-button,
.nearby-stop,
.picker-option {
  min-height: 56px;
  border-radius: 20px;
}

.search-form button {
  background: linear-gradient(180deg, var(--accent), var(--accent-strong));
  box-shadow: 0 18px 30px rgba(217, 59, 79, 0.24);
}

.picker-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(250, 246, 241, 0.96);
}

.picker-panel-copy {
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.picker-option-list {
  display: grid;
  gap: 8px;
}

.picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
  border: 1px solid var(--line);
  background: white;
  cursor: pointer;
}

@media (max-width: 860px) {
  .hero-shell--compact {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the relevant automated tests**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js`
Expected: PASS

- [ ] **Step 5: Run a manual browser verification**

Run: `python3 -m http.server 4173`
Expected: local preview starts on `http://localhost:4173`

Check:
- homepage loads with blank `From` and blank `To`
- focusing `From` opens area suggestions immediately
- selecting an area opens exact-stop refinement in `From`
- selecting an exact stop replaces the visible broad label
- focusing `To` before origin selection opens informational copy
- selecting an area populates exact destination choices

- [ ] **Step 6: Commit**

```bash
git add src/main.js styles.css tests/ui/renderSearchForm.test.js
git commit -m "feat: restyle route picker search flow"
```

## Self-Review

- Spec coverage:
  - Blank initial form state is covered by Tasks 3 and 4.
  - Immediate broad-area suggestions on `From` focus are covered by Tasks 3 and 4.
  - Soft-gated `To` behavior is covered by Tasks 3 and 4.
  - Locality-wide destination unlock and exact-stop narrowing are covered by Tasks 1 and 2.
  - Exact stop replacing the visible broad area label is covered by Tasks 2 and 3.
  - Warmer compact visual restyle is covered by Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or “write tests later” placeholders remain.
- Type consistency:
  - `destinationMode` is consistently defined as `informational`, `locality-destinations`, `exact-stop-destinations`, or `empty`.
  - `fromLocalityStopIds`, `reachableDestinations`, and `exactStopChoices` match the proposed helper and state signatures across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-route-picker-restyle.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
