# Riviera Locality Route Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `From` field locality-friendly, unlock `To` as soon as a locality is chosen, narrow `To` further after exact-origin refinement, and clean up the existing form UI.

**Architecture:** Keep the current locality and reachability data model, but add one new derived concept in the frontend: a locality-wide destination pool built from the union of stop-level reachability entries. Implement the behavior through small pure helpers in `src/lib/localities.js` and `src/lib/routePickerState.js`, then let `src/main.js` drive rendering and exact-search submission from either `fromLocalityId` or `fromStopId`.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, Node.js, `vitest`

---

## File Map

- `src/lib/localities.js`: locality and stop matching helpers plus locality-wide destination derivation.
- `src/lib/query.js`: route lookup that accepts either an exact origin stop or a broad origin locality backed by exact stop ids.
- `src/lib/routePickerState.js`: pure state transitions for locality selection, exact-origin refinement, and destination resets.
- `src/main.js`: form state, locality/exact-stop picker behavior, and submit handling.
- `src/ui/renderSearchForm.js`: helper copy, enabled/disabled states, and cleaner form structure.
- `styles.css`: lighter hero treatment and clearer picker-state styling.
- `tests/lib/localities.test.js`: locality-wide destination derivation tests.
- `tests/lib/query.test.js`: broad-origin query tests.
- `tests/lib/routePickerState.test.js`: locality selection and exact-origin narrowing tests.
- `tests/ui/renderSearchForm.test.js`: updated rendering expectations for the form and messaging.

### Task 1: Add Locality-Wide Destination And Query Helpers

**Files:**
- Modify: `src/lib/localities.js`
- Modify: `src/lib/query.js`
- Modify: `tests/lib/localities.test.js`
- Modify: `tests/lib/query.test.js`

- [ ] **Step 1: Write the failing helper tests**

```js
// tests/lib/localities.test.js
it('builds a locality-wide destination union from all stops in the locality', () => {
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
it('searches across every stop in the chosen locality when no exact origin stop is set', () => {
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

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js`
Expected: FAIL because `getLocalityReachableStops` does not exist and `findDirectTrips` only resolves a single origin stop.

- [ ] **Step 3: Write the minimal implementation**

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
export function findDirectTrips({ from, to, fromLocalityStopIds = [], fromStopId, toStopId, dayType, aliases, trips }) {
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
        const fromIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === originStopId);
        const toIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === resolvedToStopId);

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/localities.test.js tests/lib/query.test.js src/lib/localities.js src/lib/query.js
git commit -m "feat: support locality-wide destination and query helpers"
```

### Task 2: Update Picker State And Rendering Rules

**Files:**
- Modify: `src/lib/routePickerState.js`
- Modify: `src/ui/renderSearchForm.js`
- Modify: `styles.css`
- Modify: `tests/lib/routePickerState.test.js`
- Modify: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Write the failing state and UI tests**

```js
// tests/lib/routePickerState.test.js
it('enables locality-wide destinations as soon as a from locality is selected', () => {
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

  expect(nextState.formValues.fromLocalityId).toBe('porto-maurizio');
  expect(nextState.pickerState.reachableDestinations).toEqual([
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  ]);
});
```

```js
// tests/ui/renderSearchForm.test.js
it('shows locality-wide destination messaging after broad from selection', () => {
  const html = renderSearchForm({
    fromInput: 'Porto Maurizio',
    fromLocalityLabel: 'Porto Maurizio',
    exactFromStop: null,
    fromSuggestions: [{ value: 'Porto Maurizio' }, { value: 'Sanremo' }],
    toInput: '',
    reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    destinationMode: 'locality',
  });

  expect(html).not.toContain('disabled');
  expect(html).toContain('Exact destinations for Porto Maurizio');
  expect(html).toContain('Refine the departure stop to narrow this list further.');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js`
Expected: FAIL because locality selection still clears destinations and the form copy still expects `To` to remain disabled.

- [ ] **Step 3: Write the minimal implementation**

```js
// src/lib/routePickerState.js
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
      destinationMode: 'locality',
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
      destinationMode: 'exact',
    },
  };
}
```

```js
// src/ui/renderSearchForm.js
const toDisabled = reachableDestinations.length === 0 ? 'disabled' : '';
const fromHelp = fromLocalityLabel
  ? 'Choose another area or refine to an exact departure stop.'
  : 'Start from a broad place like Porto Maurizio.';
const destinationHelp = destinationMode === 'exact'
  ? 'Exact destinations from the selected stop.'
  : destinationMode === 'locality'
    ? `Exact destinations for ${fromLocalityLabel}. Refine the departure stop to narrow this list further.`
    : 'Choose an area first to unlock exact destinations.';
```

```css
/* styles.css */
.hero-shell {
  grid-template-columns: 1fr 1fr;
  padding: 24px;
}

.hero-copy h1 {
  font-size: clamp(2rem, 4.5vw, 3.6rem);
}

.search-form {
  gap: 12px;
}

.field small {
  display: block;
  padding: 0 4px;
  line-height: 1.45;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js src/lib/routePickerState.js src/ui/renderSearchForm.js styles.css
git commit -m "feat: unlock destination picker from localities"
```

### Task 3: Wire The App To The New Picker Flow

**Files:**
- Modify: `src/main.js`
- Modify: `tests/ui/renderSearchForm.test.js`
- Modify: `tests/lib/query.test.js`

- [ ] **Step 1: Write the failing integration-facing tests**

```js
// tests/lib/query.test.js
it('uses locality stop ids during submit when the origin is broad and destination is exact', () => {
  const matches = findDirectTrips({
    from: 'Porto Maurizio',
    fromLocalityStopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
    toInput: 'Sanremo',
    toStopId: 'sanremo-autostazione',
    dayType: 'feriale',
    aliases,
    trips,
  });

  expect(matches.length).toBeGreaterThan(0);
});
```

```js
// tests/ui/renderSearchForm.test.js
it('keeps from suggestions locality-wide after a locality is already selected', () => {
  const html = renderSearchForm({
    fromInput: 'Porto Maurizio',
    fromLocalityLabel: 'Porto Maurizio',
    fromSuggestions: [{ value: 'Porto Maurizio' }, { value: 'Sanremo' }],
    reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    destinationMode: 'locality',
  });

  expect(html).toContain('value="Porto Maurizio"');
  expect(html).toContain('value="Sanremo"');
  expect(html).not.toContain('label="Porto Maurizio exact stop"');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/query.test.js tests/ui/renderSearchForm.test.js`
Expected: FAIL because `main.js` and the current rendering flow still pivot `From` suggestions to exact stops and submit without locality stop ids.

- [ ] **Step 3: Write the minimal implementation**

```js
// src/main.js
const fromSuggestions = state.localities.map((locality) => ({
  value: locality.label,
  label: 'Area',
}));

const selectedLocalityStops = selectedLocality
  ? getLocalityStops(selectedLocality.id, state.localities, state.stops)
  : [];

const matches = findDirectTrips({
  from: state.formValues.fromInput,
  to: state.formValues.toInput,
  fromLocalityStopIds: selectedLocalityStops.map((stop) => stop.id),
  fromStopId: state.formValues.fromStopId,
  toStopId: state.formValues.toStopId,
  dayType: state.formValues.dayType,
  aliases: state.aliases,
  trips: state.trips,
});
```

```js
// src/main.js bindFromSelection()
const localityChoice = findExactLocalityMatch(nextValue, state.localities);

if (localityChoice) {
  selectFromLocalityChoice(localityChoice);
  renderApp();
  bindInteractions();
  return;
}

const exactStopChoice = findExactStopMatch(nextValue, state.pickerState.exactStopChoices);
if (exactStopChoice) {
  selectFromStopChoice(exactStopChoice);
  renderApp();
  bindInteractions();
  return;
}
```

- [ ] **Step 4: Run the focused tests, then the full suite**

Run: `npm test -- tests/lib/localities.test.js tests/lib/query.test.js tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.js tests/lib/localities.test.js tests/lib/query.test.js tests/lib/routePickerState.test.js tests/ui/renderSearchForm.test.js
git commit -m "feat: wire locality-first route picker flow"
```

## Self-Review

- Spec coverage: The plan covers locality-wide `To` unlocking, exact-origin narrowing, broad-origin submit semantics, UI cleanup, and tests for the changed state model.
- Placeholder scan: No `TODO`, `TBD`, or implied “fill this in later” steps remain.
- Type consistency: `fromLocalityStopIds`, `destinationMode`, `getLocalityReachableStops`, `selectLocality`, and `selectOriginStop` use the same names across tasks.
