# Connected Route Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build connected route tools: shareable route URLs, favorites and recents, clickable no-direct recovery, conservative one-transfer suggestions, Browse views for lines/stops, and offline/PWA support.

**Architecture:** Keep the app as a static vanilla JavaScript application. Add small pure modules for URL state, saved routes, transfer suggestions, and browse indexing, then wire them through `src/main.js` and focused renderers. Deliver in staged groups so each group has tests and leaves the app usable.

**Tech Stack:** Vanilla JavaScript ES modules, static JSON assets, `localStorage`, History API, Service Worker API, Web App Manifest, Vitest.

---

## Scope Check

This plan intentionally covers the six approved features in one staged implementation because they share foundations:

- active tab state
- URL state hydration
- route identity
- saved/recent route storage
- Search/Browse/Saved navigation

Splitting them into unrelated plans would duplicate state work and increase integration risk. Each task below is still independently testable and should be committed before the next task starts.

## File Structure

Create:

- `src/lib/routeUrlState.js`: parse and serialize query params for Search/Browse/Saved state.
- `tests/lib/routeUrlState.test.js`: unit coverage for URL parsing, serialization, and id-over-label behavior.
- `src/lib/savedRoutes.js`: localStorage adapter, favorite/recents caps, route identity dedupe.
- `tests/lib/savedRoutes.test.js`: unit coverage for storage failure, caps, dedupe, favorites, recents.
- `src/ui/renderTabNav.js`: top-level Search/Browse/Saved navigation markup.
- `tests/ui/renderTabNav.test.js`: renderer coverage for active nav state.
- `src/lib/transferSuggestions.js`: pure conservative one-transfer search and ranking.
- `tests/lib/transferSuggestions.test.js`: unit coverage for minimum transfer time, ranking, no-direct-only use contract.
- `src/ui/renderTransferSuggestions.js`: no-direct transfer suggestion markup.
- `tests/ui/renderTransferSuggestions.test.js`: renderer coverage for conservative suggestions and unavailable state.
- `src/lib/browseIndex.js`: derive line and stop browse models from `trips` and `stops`.
- `tests/lib/browseIndex.test.js`: unit coverage for line/stop index generation.
- `src/ui/renderBrowseView.js`: Browse tab UI for Lines and Stops.
- `tests/ui/renderBrowseView.test.js`: renderer coverage for actions that seed Search.
- `src/ui/renderSavedView.js`: Saved tab UI for favorites and recents.
- `tests/ui/renderSavedView.test.js`: renderer coverage for restore/remove actions and empty states.
- `manifest.webmanifest`: PWA install metadata.
- `service-worker.js`: app shell and static JSON cache.
- `src/lib/registerServiceWorker.js`: guarded service worker registration helper.
- `tests/lib/registerServiceWorker.test.js`: unit coverage for supported/unsupported registration.

Modify:

- `src/main.js`: add active tab state, URL hydration, saved route actions, Browse actions, no-direct action handlers, transfer suggestions, and service worker registration.
- `src/ui/renderShell.js`: accept and render tab navigation near the top of the app shell.
- `src/ui/renderNoDirectFallback.js`: render clickable suggestions and transfer suggestions.
- `src/ui/renderResults.js`: render save/share controls for successful routes.
- `src/lib/searchOutcome.js`: carry fallback suggestion metadata needed for clickable actions.
- `src/lib/i18n.js`: add labels for tabs, Browse, Saved, share/save controls, no-direct actions, and transfer suggestions in all supported languages.
- `index.html`: add manifest link and theme color.
- `styles.css`: add styles for tabs, Browse, Saved, transfer suggestions, and recovery buttons.
- Existing UI/lib tests named in each task when a renderer or pure module changes.

## Task 1: URL State And Top-Level Tabs

**Files:**

- Create: `src/lib/routeUrlState.js`
- Create: `tests/lib/routeUrlState.test.js`
- Create: `src/ui/renderTabNav.js`
- Create: `tests/ui/renderTabNav.test.js`
- Modify: `src/ui/renderShell.js`
- Modify: `tests/ui/renderShell.test.js`
- Modify: `src/main.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`

- [ ] **Step 1: Write failing URL state tests**

Create `tests/lib/routeUrlState.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE_URL_STATE,
  parseRouteUrlState,
  serializeRouteUrlState,
} from '../../src/lib/routeUrlState.js';

describe('routeUrlState', () => {
  it('parses search state with ids taking priority over labels', () => {
    const parsed = parseRouteUrlState('?tab=search&from=Porto%20Maurizio&fromStop=imperia-porto-maurizio&to=Sanremo&toStop=sanremo-autostazione&day=sabato');

    expect(parsed).toEqual({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: null,
        fromStopId: 'imperia-porto-maurizio',
        toInput: 'Sanremo',
        toStopId: 'sanremo-autostazione',
        dayType: 'sabato',
      },
      browse: {
        mode: 'lines',
        lineId: null,
        stopId: null,
      },
    });
  });

  it('falls back to defaults for unknown tabs, browse modes, and day types', () => {
    expect(parseRouteUrlState('?tab=bad&browse=bad&day=bad')).toEqual(DEFAULT_ROUTE_URL_STATE);
  });

  it('serializes stable route ids and readable labels', () => {
    const params = serializeRouteUrlState({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: 'porto-maurizio',
        fromStopId: null,
        toInput: 'Sanremo Autostazione',
        toStopId: 'sanremo-autostazione',
        dayType: 'feriale',
      },
      browse: {
        mode: 'stops',
        lineId: null,
        stopId: 'sanremo-autostazione',
      },
    });

    expect(params.toString()).toBe('tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=stops&stop=sanremo-autostazione');
  });
});
```

- [ ] **Step 2: Run URL state test to verify it fails**

Run:

```bash
npm test -- tests/lib/routeUrlState.test.js
```

Expected: FAIL because `src/lib/routeUrlState.js` does not exist.

- [ ] **Step 3: Implement URL state module**

Create `src/lib/routeUrlState.js`:

```js
const VALID_TABS = new Set(['search', 'browse', 'saved']);
const VALID_BROWSE_MODES = new Set(['lines', 'stops']);
const VALID_DAY_TYPES = new Set(['feriale', 'sabato', 'festivo', 'scolastico']);

export const DEFAULT_ROUTE_URL_STATE = {
  tab: 'search',
  search: {
    fromInput: '',
    fromLocalityId: null,
    fromStopId: null,
    toInput: '',
    toStopId: null,
    dayType: 'feriale',
  },
  browse: {
    mode: 'lines',
    lineId: null,
    stopId: null,
  },
};

function nullableParam(params, name) {
  const value = params.get(name);
  return value && value.trim() ? value : null;
}

function textParam(params, name) {
  return params.get(name)?.trim() ?? '';
}

export function parseRouteUrlState(search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tab = params.get('tab') ?? DEFAULT_ROUTE_URL_STATE.tab;
  const browseMode = params.get('browse') ?? DEFAULT_ROUTE_URL_STATE.browse.mode;
  const dayType = params.get('day') ?? DEFAULT_ROUTE_URL_STATE.search.dayType;

  if (!VALID_TABS.has(tab) || !VALID_BROWSE_MODES.has(browseMode) || !VALID_DAY_TYPES.has(dayType)) {
    return structuredClone(DEFAULT_ROUTE_URL_STATE);
  }

  return {
    tab,
    search: {
      fromInput: textParam(params, 'from'),
      fromLocalityId: nullableParam(params, 'fromLocality'),
      fromStopId: nullableParam(params, 'fromStop'),
      toInput: textParam(params, 'to'),
      toStopId: nullableParam(params, 'toStop'),
      dayType,
    },
    browse: {
      mode: browseMode,
      lineId: nullableParam(params, 'line'),
      stopId: nullableParam(params, 'stop'),
    },
  };
}

function setIfPresent(params, name, value) {
  if (value) {
    params.set(name, value);
  }
}

export function serializeRouteUrlState(routeState = DEFAULT_ROUTE_URL_STATE) {
  const params = new URLSearchParams();
  const tab = VALID_TABS.has(routeState.tab) ? routeState.tab : DEFAULT_ROUTE_URL_STATE.tab;
  const search = routeState.search ?? DEFAULT_ROUTE_URL_STATE.search;
  const browse = routeState.browse ?? DEFAULT_ROUTE_URL_STATE.browse;

  params.set('tab', tab);
  setIfPresent(params, 'from', search.fromInput);
  setIfPresent(params, 'fromLocality', search.fromLocalityId);
  setIfPresent(params, 'fromStop', search.fromStopId);
  setIfPresent(params, 'to', search.toInput);
  setIfPresent(params, 'toStop', search.toStopId);
  params.set('day', VALID_DAY_TYPES.has(search.dayType) ? search.dayType : DEFAULT_ROUTE_URL_STATE.search.dayType);
  params.set('browse', VALID_BROWSE_MODES.has(browse.mode) ? browse.mode : DEFAULT_ROUTE_URL_STATE.browse.mode);
  setIfPresent(params, 'line', browse.lineId);
  setIfPresent(params, 'stop', browse.stopId);

  return params;
}
```

- [ ] **Step 4: Run URL state test to verify it passes**

Run:

```bash
npm test -- tests/lib/routeUrlState.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing tab renderer tests**

Create `tests/ui/renderTabNav.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderTabNav } from '../../src/ui/renderTabNav.js';

describe('renderTabNav', () => {
  it('marks the active tab and exposes tab actions', () => {
    const html = renderTabNav({ activeTab: 'browse', t: createTranslator('en') });

    expect(html).toContain('data-tab-target="search"');
    expect(html).toContain('data-tab-target="browse"');
    expect(html).toContain('data-tab-target="saved"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Browse');
  });
});
```

- [ ] **Step 6: Run tab renderer test to verify it fails**

Run:

```bash
npm test -- tests/ui/renderTabNav.test.js
```

Expected: FAIL because `src/ui/renderTabNav.js` does not exist.

- [ ] **Step 7: Implement tab renderer**

Create `src/ui/renderTabNav.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const TABS = ['search', 'browse', 'saved'];

export function renderTabNav({ activeTab = 'search', t = createTranslator('en') } = {}) {
  return `
    <nav class="app-tabs" aria-label="${escapeHtml(t('tabs.label'))}">
      ${TABS.map((tab) => `
        <button
          type="button"
          class="app-tab ${activeTab === tab ? 'app-tab--active' : ''}"
          data-tab-target="${tab}"
          ${activeTab === tab ? 'aria-current="page"' : ''}
        >
          ${escapeHtml(t(`tabs.${tab}`))}
        </button>
      `).join('')}
    </nav>
  `;
}
```

- [ ] **Step 8: Add tab copy**

Modify each language dictionary in `src/lib/i18n.js` with translated values for:

```js
'tabs.label': 'Primary views',
'tabs.search': 'Search',
'tabs.browse': 'Browse',
'tabs.saved': 'Saved',
```

Use these localized values:

```js
// it
'tabs.label': 'Viste principali',
'tabs.search': 'Cerca',
'tabs.browse': 'Sfoglia',
'tabs.saved': 'Salvati',

// en
'tabs.label': 'Primary views',
'tabs.search': 'Search',
'tabs.browse': 'Browse',
'tabs.saved': 'Saved',

// fr
'tabs.label': 'Vues principales',
'tabs.search': 'Recherche',
'tabs.browse': 'Parcourir',
'tabs.saved': 'Enregistres',

// de
'tabs.label': 'Hauptansichten',
'tabs.search': 'Suche',
'tabs.browse': 'Durchsuchen',
'tabs.saved': 'Gespeichert',

// es
'tabs.label': 'Vistas principales',
'tabs.search': 'Buscar',
'tabs.browse': 'Explorar',
'tabs.saved': 'Guardados',
```

- [ ] **Step 9: Thread tabs through shell**

Modify the `renderShell` options destructuring in `src/ui/renderShell.js`:

```js
    taxiDirectory = [],
    tabNavigation = '',
    t = createTranslator('en'),
```

Then render `tabNavigation` immediately after the existing closing `</header>`:

```js
      </header>
      ${tabNavigation}
      ${renderSeoSupportCopy(t)}
```

Keep all existing shell markup intact; only add the `tabNavigation` option and render it after the header.

- [ ] **Step 10: Update shell test**

Modify `tests/ui/renderShell.test.js` by adding:

```js
  it('renders top-level tab navigation when provided', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      tabNavigation: '<nav class="app-tabs">Tabs</nav>',
      t: createTranslator('en'),
    });

    expect(html).toContain('<nav class="app-tabs">Tabs</nav>');
  });
```

- [ ] **Step 11: Add tab styles**

Append to `styles.css` near other top-level navigation styles:

```css
.app-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.app-tab {
  border: 1px solid rgba(62, 39, 24, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text, #1d1a17);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 12px 18px;
}

.app-tab--active,
.app-tab[aria-current="page"] {
  background: #eb4c60;
  border-color: #d93b4f;
  color: #ffffff;
}

.app-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(235, 76, 96, 0.18);
}
```

- [ ] **Step 12: Wire active tab and URL hydration in main**

Modify `src/main.js` imports:

```js
import { parseRouteUrlState, serializeRouteUrlState } from './lib/routeUrlState.js';
import { renderTabNav } from './ui/renderTabNav.js';
```

Extend `state`:

```js
activeTab: 'search',
browseState: {
  mode: 'lines',
  lineId: null,
  stopId: null,
},
```

Add helpers:

```js
function currentRouteUrlState() {
  return {
    tab: state.activeTab,
    search: state.formValues,
    browse: state.browseState,
  };
}

function writeRouteUrl({ push = false } = {}) {
  const params = serializeRouteUrlState(currentRouteUrlState());
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  if (push) {
    window.history.pushState(currentRouteUrlState(), '', nextUrl);
  } else {
    window.history.replaceState(currentRouteUrlState(), '', nextUrl);
  }
}
```

In `boot()`, after bootstrap data loads and before `renderApp()`:

```js
const urlState = parseRouteUrlState(window.location.search);
state.activeTab = urlState.tab;
state.formValues = {
  ...bootData.formValues,
  ...urlState.search,
  dayType: urlState.search.dayType || bootData.formValues.dayType,
};
state.browseState = urlState.browse;
```

In `renderApp()`, pass tabs to shell:

```js
tabNavigation: renderTabNav({ activeTab: state.activeTab, t }),
```

Add binding:

```js
function bindTabNavigation() {
  document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tabTarget ?? 'search';
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });
}
```

Call `bindTabNavigation()` inside `bindInteractions()`.

Add popstate support in `boot()` after the first render:

```js
window.addEventListener('popstate', () => {
  const urlState = parseRouteUrlState(window.location.search);
  state.activeTab = urlState.tab;
  state.formValues = {
    ...state.formValues,
    ...urlState.search,
  };
  state.browseState = urlState.browse;
  renderApp();
  bindInteractions();
});
```

- [ ] **Step 13: Run focused tests**

Run:

```bash
npm test -- tests/lib/routeUrlState.test.js tests/ui/renderTabNav.test.js tests/ui/renderShell.test.js
```

Expected: PASS.

- [ ] **Step 14: Commit URL and tab foundation**

Run:

```bash
git add src/lib/routeUrlState.js tests/lib/routeUrlState.test.js src/ui/renderTabNav.js tests/ui/renderTabNav.test.js src/ui/renderShell.js tests/ui/renderShell.test.js src/main.js src/lib/i18n.js styles.css
git commit -m "feat: add route URL state and tabs"
```

## Task 2: Saved Favorites And Recent Searches

**Files:**

- Create: `src/lib/savedRoutes.js`
- Create: `tests/lib/savedRoutes.test.js`
- Create: `src/ui/renderSavedView.js`
- Create: `tests/ui/renderSavedView.test.js`
- Modify: `src/main.js`
- Modify: `src/ui/renderResults.js`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`

- [ ] **Step 1: Write failing saved route tests**

Create `tests/lib/savedRoutes.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  addFavoriteRoute,
  addRecentRoute,
  createRouteIdentity,
  readSavedRoutes,
  removeFavoriteRoute,
} from '../../src/lib/savedRoutes.js';

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue) {
    values.set('riviera:saved-routes', JSON.stringify(initialValue));
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const route = {
  fromInput: 'Porto Maurizio',
  fromLocalityId: 'porto-maurizio',
  fromStopId: null,
  toInput: 'Sanremo Autostazione',
  toStopId: 'sanremo-autostazione',
  dayType: 'feriale',
  resultType: 'results',
  resultCount: 4,
  timestamp: '2026-05-14T09:00:00.000Z',
};

describe('savedRoutes', () => {
  it('builds a stable route identity from ids and labels', () => {
    expect(createRouteIdentity(route)).toBe('porto-maurizio||Sanremo Autostazione|sanremo-autostazione|feriale');
  });

  it('adds recent routes newest first and dedupes by identity', () => {
    const storage = createStorage();
    addRecentRoute(storage, route);
    addRecentRoute(storage, { ...route, timestamp: '2026-05-14T10:00:00.000Z', resultCount: 2 });

    expect(readSavedRoutes(storage).recents).toHaveLength(1);
    expect(readSavedRoutes(storage).recents[0]).toMatchObject({
      timestamp: '2026-05-14T10:00:00.000Z',
      resultCount: 2,
    });
  });

  it('caps favorites and recents at 8 entries', () => {
    const storage = createStorage();
    for (let index = 0; index < 10; index += 1) {
      addRecentRoute(storage, { ...route, toInput: `Stop ${index}`, toStopId: `stop-${index}` });
      addFavoriteRoute(storage, { ...route, toInput: `Fav ${index}`, toStopId: `fav-${index}` });
    }

    expect(readSavedRoutes(storage).recents).toHaveLength(8);
    expect(readSavedRoutes(storage).favorites).toHaveLength(8);
  });

  it('removes favorites by identity', () => {
    const storage = createStorage();
    addFavoriteRoute(storage, route);
    removeFavoriteRoute(storage, createRouteIdentity(route));

    expect(readSavedRoutes(storage).favorites).toEqual([]);
  });

  it('returns empty lists when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(readSavedRoutes(storage)).toEqual({ favorites: [], recents: [], available: false });
  });
});
```

- [ ] **Step 2: Run saved route tests to verify they fail**

Run:

```bash
npm test -- tests/lib/savedRoutes.test.js
```

Expected: FAIL because `src/lib/savedRoutes.js` does not exist.

- [ ] **Step 3: Implement saved route module**

Create `src/lib/savedRoutes.js`:

```js
export const SAVED_ROUTES_STORAGE_KEY = 'riviera:saved-routes';
export const SAVED_ROUTE_LIMIT = 8;

const EMPTY_STATE = { favorites: [], recents: [], available: true };

function safeRoute(route) {
  return {
    fromInput: route.fromInput ?? '',
    fromLocalityId: route.fromLocalityId ?? null,
    fromStopId: route.fromStopId ?? null,
    toInput: route.toInput ?? '',
    toStopId: route.toStopId ?? null,
    dayType: route.dayType ?? 'feriale',
    resultType: route.resultType ?? null,
    resultCount: Number.isFinite(route.resultCount) ? route.resultCount : 0,
    timestamp: route.timestamp ?? new Date().toISOString(),
  };
}

export function createRouteIdentity(route) {
  const safe = safeRoute(route);
  const fromKey = safe.fromStopId ?? safe.fromLocalityId ?? safe.fromInput;
  const toKey = safe.toStopId ?? safe.toInput;
  return `${fromKey}|${safe.fromStopId ?? ''}|${safe.toInput}|${toKey}|${safe.dayType}`;
}

export function readSavedRoutes(storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(SAVED_ROUTES_STORAGE_KEY) ?? '{}');
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      available: true,
    };
  } catch {
    return { ...EMPTY_STATE, available: false };
  }
}

function writeSavedRoutes(storage, state) {
  storage.setItem(SAVED_ROUTES_STORAGE_KEY, JSON.stringify({
    favorites: state.favorites.slice(0, SAVED_ROUTE_LIMIT),
    recents: state.recents.slice(0, SAVED_ROUTE_LIMIT),
  }));
}

function upsertRoute(routes, route) {
  const safe = safeRoute(route);
  const identity = createRouteIdentity(safe);
  return [
    { ...safe, identity },
    ...routes.filter((entry) => entry.identity !== identity),
  ].slice(0, SAVED_ROUTE_LIMIT);
}

export function addRecentRoute(storage, route) {
  const state = readSavedRoutes(storage);
  if (!state.available) {
    return state;
  }
  const nextState = {
    ...state,
    recents: upsertRoute(state.recents, route),
  };
  writeSavedRoutes(storage, nextState);
  return readSavedRoutes(storage);
}

export function addFavoriteRoute(storage, route) {
  const state = readSavedRoutes(storage);
  if (!state.available) {
    return state;
  }
  const nextState = {
    ...state,
    favorites: upsertRoute(state.favorites, route),
  };
  writeSavedRoutes(storage, nextState);
  return readSavedRoutes(storage);
}

export function removeFavoriteRoute(storage, identity) {
  const state = readSavedRoutes(storage);
  if (!state.available) {
    return state;
  }
  const nextState = {
    ...state,
    favorites: state.favorites.filter((entry) => entry.identity !== identity),
  };
  writeSavedRoutes(storage, nextState);
  return readSavedRoutes(storage);
}
```

- [ ] **Step 4: Run saved route tests to verify they pass**

Run:

```bash
npm test -- tests/lib/savedRoutes.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing Saved view tests**

Create `tests/ui/renderSavedView.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderSavedView } from '../../src/ui/renderSavedView.js';

const route = {
  identity: 'porto|to|feriale',
  fromInput: 'Porto Maurizio',
  toInput: 'Sanremo Autostazione',
  dayType: 'feriale',
  timestamp: '2026-05-14T09:00:00.000Z',
  resultType: 'results',
  resultCount: 4,
};

describe('renderSavedView', () => {
  it('renders favorites and recents with restore actions', () => {
    const html = renderSavedView({
      t: createTranslator('en'),
      favorites: [route],
      recents: [{ ...route, identity: 'recent' }],
      available: true,
    });

    expect(html).toContain('Saved routes');
    expect(html).toContain('Recent searches');
    expect(html).toContain('data-saved-route="porto|to|feriale"');
    expect(html).toContain('data-recent-route="recent"');
    expect(html).toContain('Porto Maurizio');
    expect(html).toContain('Sanremo Autostazione');
  });

  it('renders a storage unavailable message', () => {
    const html = renderSavedView({
      t: createTranslator('en'),
      favorites: [],
      recents: [],
      available: false,
    });

    expect(html).toContain('Saved routes are unavailable in this browser');
  });
});
```

- [ ] **Step 6: Implement Saved view renderer**

Create `src/ui/renderSavedView.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRouteEntry(route, { t, attributeName, removable = false }) {
  return `
    <article class="saved-route-entry">
      <button type="button" class="saved-route-main" ${attributeName}="${escapeHtml(route.identity)}">
        <strong>${escapeHtml(route.fromInput)} → ${escapeHtml(route.toInput)}</strong>
        <span>${escapeHtml(t(`search.dayType.${route.dayType}`))} · ${escapeHtml(String(route.resultCount ?? 0))} ${escapeHtml(t('saved.results'))}</span>
      </button>
      ${removable ? `
        <button type="button" class="saved-route-remove" data-remove-favorite="${escapeHtml(route.identity)}">
          ${escapeHtml(t('saved.remove'))}
        </button>
      ` : ''}
    </article>
  `;
}

function renderRouteList(routes, options) {
  if (!routes.length) {
    return `<p class="saved-empty">${escapeHtml(options.t(options.emptyKey))}</p>`;
  }
  return routes.map((route) => renderRouteEntry(route, options)).join('');
}

export function renderSavedView({
  t = createTranslator('en'),
  favorites = [],
  recents = [],
  available = true,
} = {}) {
  if (!available) {
    return `
      <section class="saved-view">
        <h2>${escapeHtml(t('saved.title'))}</h2>
        <p>${escapeHtml(t('saved.unavailable'))}</p>
      </section>
    `;
  }

  return `
    <section class="saved-view">
      <div class="section-head">
        <h2>${escapeHtml(t('saved.title'))}</h2>
        <p>${escapeHtml(t('saved.subtitle'))}</p>
      </div>
      <section class="saved-section">
        <h3>${escapeHtml(t('saved.favorites'))}</h3>
        ${renderRouteList(favorites, {
          t,
          attributeName: 'data-saved-route',
          emptyKey: 'saved.emptyFavorites',
          removable: true,
        })}
      </section>
      <section class="saved-section">
        <h3>${escapeHtml(t('saved.recents'))}</h3>
        ${renderRouteList(recents, {
          t,
          attributeName: 'data-recent-route',
          emptyKey: 'saved.emptyRecents',
        })}
      </section>
    </section>
  `;
}
```

- [ ] **Step 7: Add Saved copy**

Add these keys to every language in `src/lib/i18n.js`:

```js
// it
'saved.title': 'Percorsi salvati',
'saved.subtitle': 'Riapri percorsi preferiti e ricerche recenti.',
'saved.favorites': 'Preferiti',
'saved.recents': 'Ricerche recenti',
'saved.results': 'risultati',
'saved.remove': 'Rimuovi',
'saved.emptyFavorites': 'Nessun percorso preferito salvato.',
'saved.emptyRecents': 'Nessuna ricerca recente.',
'saved.unavailable': 'I percorsi salvati non sono disponibili in questo browser.',
'results.saveRoute': 'Salva percorso',
'results.shareRoute': 'Condividi',

// en
'saved.title': 'Saved routes',
'saved.subtitle': 'Reopen favorite routes and recent searches.',
'saved.favorites': 'Favorites',
'saved.recents': 'Recent searches',
'saved.results': 'results',
'saved.remove': 'Remove',
'saved.emptyFavorites': 'No favorite routes saved yet.',
'saved.emptyRecents': 'No recent searches yet.',
'saved.unavailable': 'Saved routes are unavailable in this browser.',
'results.saveRoute': 'Save route',
'results.shareRoute': 'Share',

// fr
'saved.title': 'Itineraires enregistres',
'saved.subtitle': 'Rouvrir les itineraires favoris et les recherches recentes.',
'saved.favorites': 'Favoris',
'saved.recents': 'Recherches recentes',
'saved.results': 'resultats',
'saved.remove': 'Retirer',
'saved.emptyFavorites': 'Aucun itineraire favori enregistre.',
'saved.emptyRecents': 'Aucune recherche recente.',
'saved.unavailable': 'Les itineraires enregistres ne sont pas disponibles dans ce navigateur.',
'results.saveRoute': 'Enregistrer',
'results.shareRoute': 'Partager',

// de
'saved.title': 'Gespeicherte Routen',
'saved.subtitle': 'Favoriten und letzte Suchen wieder oeffnen.',
'saved.favorites': 'Favoriten',
'saved.recents': 'Letzte Suchen',
'saved.results': 'Ergebnisse',
'saved.remove': 'Entfernen',
'saved.emptyFavorites': 'Noch keine Favoriten gespeichert.',
'saved.emptyRecents': 'Noch keine letzten Suchen.',
'saved.unavailable': 'Gespeicherte Routen sind in diesem Browser nicht verfuegbar.',
'results.saveRoute': 'Route speichern',
'results.shareRoute': 'Teilen',

// es
'saved.title': 'Rutas guardadas',
'saved.subtitle': 'Vuelve a abrir rutas favoritas y busquedas recientes.',
'saved.favorites': 'Favoritas',
'saved.recents': 'Busquedas recientes',
'saved.results': 'resultados',
'saved.remove': 'Quitar',
'saved.emptyFavorites': 'No hay rutas favoritas guardadas.',
'saved.emptyRecents': 'No hay busquedas recientes.',
'saved.unavailable': 'Las rutas guardadas no estan disponibles en este navegador.',
'results.saveRoute': 'Guardar ruta',
'results.shareRoute': 'Compartir',
```

- [ ] **Step 8: Add save/share controls to results renderer test**

Modify the first test in `tests/ui/renderResults.test.js` to expect:

```js
expect(html).toContain('data-save-current-route');
expect(html).toContain('data-share-current-route');
expect(html).toContain('Save route');
expect(html).toContain('Share');
```

- [ ] **Step 9: Add save/share controls to results renderer**

Modify `src/ui/renderResults.js` inside `.summary-head` after `.summary-lines`:

```js
          <div class="summary-actions">
            <button type="button" class="topbar-link" data-save-current-route>${t('results.saveRoute')}</button>
            <button type="button" class="topbar-link" data-share-current-route>${t('results.shareRoute')}</button>
          </div>
```

- [ ] **Step 10: Wire storage actions in main**

Modify `src/main.js` imports:

```js
import {
  addFavoriteRoute,
  addRecentRoute,
  readSavedRoutes,
  removeFavoriteRoute,
} from './lib/savedRoutes.js';
import { renderSavedView } from './ui/renderSavedView.js';
```

Extend `state`:

```js
savedRoutes: { favorites: [], recents: [], available: true },
```

Add route snapshot helper:

```js
function currentSavedRouteSnapshot({ resultType = null, resultCount = 0 } = {}) {
  return {
    ...state.formValues,
    resultType,
    resultCount,
    timestamp: new Date().toISOString(),
  };
}
```

After search outcome is built in submit handler:

```js
state.savedRoutes = addRecentRoute(window.localStorage, currentSavedRouteSnapshot({
  resultType: outcome.type,
  resultCount: matches.length,
}));
```

In `boot()`, after bootstrap data:

```js
state.savedRoutes = readSavedRoutes(window.localStorage);
```

In `renderApp()`, render Saved when active:

```js
if (state.activeTab === 'saved') {
  parts.push(renderSavedView({
    t,
    favorites: state.savedRoutes.favorites,
    recents: state.savedRoutes.recents,
    available: state.savedRoutes.available,
  }));
}
```

Add handlers:

```js
function restoreSavedRoute(route) {
  state.activeTab = 'search';
  state.formValues = {
    ...state.formValues,
    fromInput: route.fromInput,
    fromLocalityId: route.fromLocalityId,
    fromStopId: route.fromStopId,
    toInput: route.toInput,
    toStopId: route.toStopId,
    dayType: route.dayType,
  };
  state.resultState = null;
  writeRouteUrl({ push: true });
  renderApp();
  bindInteractions();
}

function bindSavedRoutes() {
  document.querySelector('[data-save-current-route]')?.addEventListener('click', () => {
    state.savedRoutes = addFavoriteRoute(window.localStorage, currentSavedRouteSnapshot({
      resultType: state.resultState?.type ?? null,
      resultCount: state.resultState?.type === 'results' ? state.resultState.allDepartures.length : 0,
    }));
    renderApp();
    bindInteractions();
  });

  document.querySelector('[data-share-current-route]')?.addEventListener('click', async () => {
    writeRouteUrl({ push: false });
    await navigator.clipboard?.writeText(window.location.href);
  });

  document.querySelectorAll('[data-saved-route], [data-recent-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const identity = button.dataset.savedRoute ?? button.dataset.recentRoute;
      const route = [...state.savedRoutes.favorites, ...state.savedRoutes.recents]
        .find((entry) => entry.identity === identity);
      if (route) {
        restoreSavedRoute(route);
      }
    });
  });

  document.querySelectorAll('[data-remove-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      state.savedRoutes = removeFavoriteRoute(window.localStorage, button.dataset.removeFavorite);
      renderApp();
      bindInteractions();
    });
  });
}
```

Call `bindSavedRoutes()` inside `bindInteractions()`.

- [ ] **Step 11: Add Saved styles**

Append to `styles.css`:

```css
.saved-view,
.saved-section {
  background: rgba(255, 251, 247, 0.84);
  border: 1px solid rgba(62, 39, 24, 0.1);
  border-radius: 24px;
  padding: 24px;
}

.saved-view {
  display: grid;
  gap: 18px;
}

.saved-route-entry {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-top: 12px;
}

.saved-route-main,
.saved-route-remove {
  border: 1px solid rgba(62, 39, 24, 0.12);
  border-radius: 18px;
  background: #ffffff;
  color: #1d1a17;
  cursor: pointer;
  font: inherit;
  padding: 14px 16px;
}

.saved-route-main {
  display: grid;
  flex: 1;
  gap: 4px;
  text-align: left;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
```

- [ ] **Step 12: Run focused tests**

Run:

```bash
npm test -- tests/lib/savedRoutes.test.js tests/ui/renderSavedView.test.js tests/ui/renderResults.test.js
```

Expected: PASS.

- [ ] **Step 13: Commit Saved routes**

Run:

```bash
git add src/lib/savedRoutes.js tests/lib/savedRoutes.test.js src/ui/renderSavedView.js tests/ui/renderSavedView.test.js src/main.js src/ui/renderResults.js tests/ui/renderResults.test.js src/lib/i18n.js styles.css
git commit -m "feat: add saved and recent routes"
```

## Task 3: Clickable No-Direct Recovery

**Files:**

- Modify: `src/lib/searchOutcome.js`
- Modify: `tests/lib/searchOutcome.test.js`
- Modify: `src/ui/renderNoDirectFallback.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`
- Modify: `src/main.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`

- [ ] **Step 1: Expand fallback suggestion tests**

Modify `tests/lib/searchOutcome.test.js` no-direct test to expect action metadata:

```js
expect(outcome.suggestions[0]).toMatchObject({
  kind: 'origin-stop',
  stopId: 'imperia-porto-maurizio-piazza-dante',
  label: 'Imperia Porto Maurizio Piazza Dante',
  action: {
    type: 'set-origin-stop',
    stopId: 'imperia-porto-maurizio-piazza-dante',
  },
});
```

Add a destination suggestion test:

```js
  it('returns reachable destination suggestions for a broad locality no-direct search', () => {
    const outcome = buildSearchOutcome({
      matches: [],
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      fromStopId: null,
      localities,
      reachability: {
        'imperia-porto-maurizio': ['sanremo-autostazione'],
      },
      stops,
    });

    expect(outcome.suggestions[0]).toMatchObject({
      kind: 'destination-stop',
      stopId: 'sanremo-autostazione',
      label: 'Sanremo Autostazione',
      action: {
        type: 'set-destination-stop',
        stopId: 'sanremo-autostazione',
      },
    });
  });
```

- [ ] **Step 2: Run search outcome tests to verify they fail**

Run:

```bash
npm test -- tests/lib/searchOutcome.test.js
```

Expected: FAIL because suggestion actions are not returned.

- [ ] **Step 3: Add action metadata**

Modify `src/lib/searchOutcome.js` suggestion mapping:

```js
.map((stop) => ({
  kind: 'origin-stop',
  stopId: stop.id,
  label: stop.canonical,
  action: {
    type: 'set-origin-stop',
    stopId: stop.id,
  },
}))
```

For destination suggestions:

```js
.map((stop) => ({
  kind: 'destination-stop',
  stopId: stop.id,
  label: stop.canonical,
  action: {
    type: 'set-destination-stop',
    stopId: stop.id,
  },
}))
```

- [ ] **Step 4: Run search outcome tests**

Run:

```bash
npm test -- tests/lib/searchOutcome.test.js
```

Expected: PASS.

- [ ] **Step 5: Update no-direct renderer test for buttons**

Modify `tests/ui/renderNoDirectFallback.test.js` first test:

```js
expect(html).toContain('data-no-direct-action="set-origin-stop"');
expect(html).toContain('data-stop-id="imperia-porto-maurizio-piazza-dante"');
expect(html).toContain('<button type="button"');
```

Update the suggestion fixture:

```js
{
  kind: 'origin-stop',
  stopId: 'imperia-porto-maurizio-piazza-dante',
  label: 'Imperia Porto Maurizio Piazza Dante',
  action: {
    type: 'set-origin-stop',
    stopId: 'imperia-porto-maurizio-piazza-dante',
  },
}
```

- [ ] **Step 6: Render clickable recovery buttons**

Modify `src/ui/renderNoDirectFallback.js` fallback suggestions block:

```js
function renderFallbackSuggestion(suggestion) {
  const action = suggestion.action ?? {};
  return `
    <button
      type="button"
      class="picker-panel-tag fallback-suggestion-button"
      data-no-direct-action="${escapeHtml(action.type ?? '')}"
      data-stop-id="${escapeHtml(action.stopId ?? suggestion.stopId ?? '')}"
    >
      ${escapeHtml(suggestion.label)}
    </button>
  `;
}
```

Replace:

```js
${suggestions.map((suggestion) => `<span class="picker-panel-tag">${escapeHtml(suggestion.label)}</span>`).join('')}
```

with:

```js
${suggestions.map(renderFallbackSuggestion).join('')}
```

- [ ] **Step 7: Wire no-direct action handlers**

Add to `src/main.js`:

```js
function submitCurrentSearch() {
  const matches = findDirectTrips({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    fromStopId: state.formValues.fromStopId,
    fromLocalityStopIds: state.formValues.fromStopId
      ? []
      : (state.localities.find((locality) => locality.id === state.formValues.fromLocalityId)?.stopIds ?? []),
    toStopId: state.formValues.toStopId,
    dayType: state.formValues.dayType,
    aliases: state.aliases,
    trips: state.trips,
  });

  const outcome = buildSearchOutcome({
    matches,
    now: new Date(),
    fromLocalityId: state.formValues.fromLocalityId,
    fromStopId: state.formValues.fromStopId,
    localities: state.localities,
    reachability: state.reachability,
    stops: state.stops,
  });

  state.resultState = outcome.type === 'results'
    ? { ...outcome, selectedTripKey: null }
    : outcome;

  return matches;
}

function bindNoDirectActions() {
  document.querySelectorAll('[data-no-direct-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const stop = state.stops.find((entry) => entry.id === button.dataset.stopId);
      if (!stop) {
        return;
      }

      if (button.dataset.noDirectAction === 'set-origin-stop') {
        selectFromStopChoice(stop);
      }

      if (button.dataset.noDirectAction === 'set-destination-stop') {
        state.formValues = {
          ...state.formValues,
          toInput: stop.canonical,
          toStopId: stop.id,
        };
      }

      state.activeTab = 'search';
      submitCurrentSearch();
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });
}
```

Replace duplicated direct-search logic in `bindForm()` with a call to `submitCurrentSearch()` and use its returned matches for analytics/recent-search counts.

Call `bindNoDirectActions()` inside `bindInteractions()`.

- [ ] **Step 8: Add recovery button styles**

Append to `styles.css`:

```css
.fallback-suggestion-button {
  cursor: pointer;
  font: inherit;
}

.fallback-suggestion-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(235, 76, 96, 0.18);
}
```

- [ ] **Step 9: Run focused tests**

Run:

```bash
npm test -- tests/lib/searchOutcome.test.js tests/ui/renderNoDirectFallback.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit clickable recovery**

Run:

```bash
git add src/lib/searchOutcome.js tests/lib/searchOutcome.test.js src/ui/renderNoDirectFallback.js tests/ui/renderNoDirectFallback.test.js src/main.js src/lib/i18n.js styles.css
git commit -m "feat: make no-direct recovery actionable"
```

## Task 4: Conservative One-Transfer Suggestions

**Files:**

- Create: `src/lib/transferSuggestions.js`
- Create: `tests/lib/transferSuggestions.test.js`
- Create: `src/ui/renderTransferSuggestions.js`
- Create: `tests/ui/renderTransferSuggestions.test.js`
- Modify: `src/ui/renderNoDirectFallback.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`
- Modify: `src/main.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`

- [ ] **Step 1: Write failing transfer suggestion tests**

Create `tests/lib/transferSuggestions.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { findOneTransferSuggestions } from '../../src/lib/transferSuggestions.js';

const trips = [
  {
    lineId: 'A',
    dayType: 'feriale',
    direction: 'East',
    sourcePage: 10,
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:00' },
      { stopId: 'transfer', name: 'Transfer', time: '08:20' },
    ],
  },
  {
    lineId: 'B',
    dayType: 'feriale',
    direction: 'South',
    sourcePage: 11,
    stops: [
      { stopId: 'transfer', name: 'Transfer', time: '08:27' },
      { stopId: 'destination', name: 'Destination', time: '09:00' },
    ],
  },
  {
    lineId: 'C',
    dayType: 'feriale',
    direction: 'Too Tight',
    sourcePage: 12,
    stops: [
      { stopId: 'transfer', name: 'Transfer', time: '08:22' },
      { stopId: 'destination', name: 'Destination', time: '08:50' },
    ],
  },
  {
    lineId: 'D',
    dayType: 'sabato',
    direction: 'Wrong Day',
    sourcePage: 13,
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:05' },
      { stopId: 'transfer', name: 'Transfer', time: '08:25' },
    ],
  },
];

describe('findOneTransferSuggestions', () => {
  it('finds conservative same-day one-transfer suggestions with at least 5 minutes to change', () => {
    const suggestions = findOneTransferSuggestions({
      trips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T07:30:00'),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      transferStopId: 'transfer',
      waitMinutes: 7,
      totalDurationMinutes: 60,
      firstLeg: {
        lineId: 'A',
        departureTime: '08:00',
        arrivalTime: '08:20',
        sourcePage: 10,
      },
      secondLeg: {
        lineId: 'B',
        departureTime: '08:27',
        arrivalTime: '09:00',
        sourcePage: 11,
      },
    });
  });

  it('falls back to earliest full-day options without next language when service has passed', () => {
    const suggestions = findOneTransferSuggestions({
      trips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T20:30:00'),
    });

    expect(suggestions[0]).toMatchObject({
      isFuture: false,
      firstLeg: { departureTime: '08:00' },
    });
  });

  it('returns at most 3 suggestions', () => {
    const manyTrips = Array.from({ length: 6 }, (_, index) => ([
      {
        lineId: `A${index}`,
        dayType: 'feriale',
        sourcePage: 20 + index,
        stops: [
          { stopId: 'origin', name: 'Origin', time: `0${index + 6}:00` },
          { stopId: `transfer-${index}`, name: `Transfer ${index}`, time: `0${index + 6}:20` },
        ],
      },
      {
        lineId: `B${index}`,
        dayType: 'feriale',
        sourcePage: 30 + index,
        stops: [
          { stopId: `transfer-${index}`, name: `Transfer ${index}`, time: `0${index + 6}:30` },
          { stopId: 'destination', name: 'Destination', time: `0${index + 6}:50` },
        ],
      },
    ])).flat();

    expect(findOneTransferSuggestions({
      trips: manyTrips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T05:00:00'),
    })).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run transfer tests to verify they fail**

Run:

```bash
npm test -- tests/lib/transferSuggestions.test.js
```

Expected: FAIL because `src/lib/transferSuggestions.js` does not exist.

- [ ] **Step 3: Implement transfer suggestion module**

Create `src/lib/transferSuggestions.js`:

```js
import { durationBetween, toMinutes } from './time.js';

const MIN_TRANSFER_MINUTES = 5;
const MAX_TRANSFER_SUGGESTIONS = 3;

function findStopIndex(trip, stopId) {
  return trip.stops.findIndex((stop) => stop.stopId === stopId);
}

function buildLeg(trip, fromIndex, toIndex) {
  const fromStop = trip.stops[fromIndex];
  const toStop = trip.stops[toIndex];
  return {
    lineId: trip.lineId,
    direction: trip.direction,
    sourcePage: trip.sourcePage,
    fromStopId: fromStop.stopId,
    toStopId: toStop.stopId,
    fromStopName: fromStop.name,
    toStopName: toStop.name,
    departureTime: fromStop.time,
    arrivalTime: toStop.time,
    durationMinutes: durationBetween(fromStop.time, toStop.time),
  };
}

function firstLegs({ trips, fromStopIds, dayType }) {
  return trips
    .filter((trip) => trip.dayType === dayType)
    .flatMap((trip) =>
      fromStopIds.flatMap((fromStopId) => {
        const fromIndex = findStopIndex(trip, fromStopId);
        if (fromIndex === -1) {
          return [];
        }
        return trip.stops.slice(fromIndex + 1).map((stop, offset) => ({
          trip,
          fromIndex,
          transferIndex: fromIndex + 1 + offset,
          transferStopId: stop.stopId,
        }));
      }));
}

function secondLegFor({ trips, transferStopId, toStopId, dayType, earliestDepartureMinutes }) {
  return trips
    .filter((trip) => trip.dayType === dayType)
    .map((trip) => {
      const transferIndex = findStopIndex(trip, transferStopId);
      const toIndex = findStopIndex(trip, toStopId);
      if (transferIndex === -1 || toIndex === -1 || transferIndex >= toIndex) {
        return null;
      }
      const departureMinutes = toMinutes(trip.stops[transferIndex].time);
      if (departureMinutes < earliestDepartureMinutes) {
        return null;
      }
      return { trip, transferIndex, toIndex };
    })
    .filter(Boolean)
    .sort((left, right) =>
      toMinutes(left.trip.stops[left.transferIndex].time) - toMinutes(right.trip.stops[right.transferIndex].time))
    [0] ?? null;
}

function rankSuggestions(suggestions, nowMinutes) {
  const future = suggestions.filter((suggestion) => toMinutes(suggestion.firstLeg.departureTime) >= nowMinutes);
  const rankedSource = future.length ? future : suggestions;
  return rankedSource
    .map((suggestion) => ({
      ...suggestion,
      isFuture: future.length > 0,
    }))
    .sort((left, right) =>
      toMinutes(left.firstLeg.departureTime) - toMinutes(right.firstLeg.departureTime)
      || left.totalDurationMinutes - right.totalDurationMinutes
      || left.waitMinutes - right.waitMinutes
      || left.transferStopId.localeCompare(right.transferStopId)
      || left.firstLeg.lineId.localeCompare(right.firstLeg.lineId)
      || left.secondLeg.lineId.localeCompare(right.secondLeg.lineId))
    .slice(0, MAX_TRANSFER_SUGGESTIONS);
}

export function findOneTransferSuggestions({
  trips = [],
  fromStopIds = [],
  toStopId = null,
  dayType = 'feriale',
  now = new Date(),
} = {}) {
  if (!fromStopIds.length || !toStopId) {
    return [];
  }

  const candidates = firstLegs({ trips, fromStopIds, dayType })
    .map((candidate) => {
      const firstLeg = buildLeg(candidate.trip, candidate.fromIndex, candidate.transferIndex);
      const earliestDepartureMinutes = toMinutes(firstLeg.arrivalTime) + MIN_TRANSFER_MINUTES;
      const second = secondLegFor({
        trips,
        transferStopId: candidate.transferStopId,
        toStopId,
        dayType,
        earliestDepartureMinutes,
      });

      if (!second) {
        return null;
      }

      const secondLeg = buildLeg(second.trip, second.transferIndex, second.toIndex);
      return {
        transferStopId: candidate.transferStopId,
        transferStopName: firstLeg.toStopName,
        firstLeg,
        secondLeg,
        waitMinutes: durationBetween(firstLeg.arrivalTime, secondLeg.departureTime),
        totalDurationMinutes: durationBetween(firstLeg.departureTime, secondLeg.arrivalTime),
      };
    })
    .filter(Boolean);

  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return rankSuggestions(candidates, nowMinutes);
}
```

- [ ] **Step 4: Run transfer tests**

Run:

```bash
npm test -- tests/lib/transferSuggestions.test.js
```

Expected: PASS.

- [ ] **Step 5: Write transfer renderer tests**

Create `tests/ui/renderTransferSuggestions.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderTransferSuggestions } from '../../src/ui/renderTransferSuggestions.js';

const suggestion = {
  transferStopName: 'Imperia Oneglia',
  waitMinutes: 7,
  totalDurationMinutes: 60,
  isFuture: true,
  firstLeg: {
    lineId: '12',
    departureTime: '08:00',
    arrivalTime: '08:20',
    sourcePage: 10,
  },
  secondLeg: {
    lineId: '2',
    departureTime: '08:27',
    arrivalTime: '09:00',
    sourcePage: 11,
  },
};

describe('renderTransferSuggestions', () => {
  it('renders conservative transfer suggestions with PDF links', () => {
    const html = renderTransferSuggestions({
      t: createTranslator('en'),
      suggestions: [suggestion],
      pdfUrl: 'https://example.com/rt.pdf',
    });

    expect(html).toContain('Possible one-change options');
    expect(html).toContain('Imperia Oneglia');
    expect(html).toContain('Line 12');
    expect(html).toContain('Line 2');
    expect(html).toContain('7 min');
    expect(html).toContain('https://example.com/rt.pdf#page=10');
    expect(html).toContain('https://example.com/rt.pdf#page=11');
  });

  it('renders an unavailable message when no suggestions exist', () => {
    const html = renderTransferSuggestions({
      t: createTranslator('en'),
      suggestions: [],
      pdfUrl: 'https://example.com/rt.pdf',
    });

    expect(html).toContain('No conservative one-change option found');
  });
});
```

- [ ] **Step 6: Implement transfer renderer**

Create `src/ui/renderTransferSuggestions.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderPdfLink(pdfUrl, page, label) {
  return `<a href="${escapeHtml(pdfUrl)}#page=${escapeHtml(page)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function renderSuggestion(suggestion, t, pdfUrl) {
  return `
    <article class="transfer-suggestion">
      <div class="transfer-suggestion-head">
        <h4>${escapeHtml(suggestion.transferStopName)}</h4>
        <span>${escapeHtml(suggestion.totalDurationMinutes)} min · ${escapeHtml(t('transfer.wait', { minutes: suggestion.waitMinutes }))}</span>
      </div>
      <ol class="transfer-legs">
        <li>
          <strong>${escapeHtml(t('results.line'))} ${escapeHtml(suggestion.firstLeg.lineId)}</strong>
          <span>${escapeHtml(suggestion.firstLeg.departureTime)} → ${escapeHtml(suggestion.firstLeg.arrivalTime)}</span>
          ${renderPdfLink(pdfUrl, suggestion.firstLeg.sourcePage, t('results.openPdf'))}
        </li>
        <li>
          <strong>${escapeHtml(t('results.line'))} ${escapeHtml(suggestion.secondLeg.lineId)}</strong>
          <span>${escapeHtml(suggestion.secondLeg.departureTime)} → ${escapeHtml(suggestion.secondLeg.arrivalTime)}</span>
          ${renderPdfLink(pdfUrl, suggestion.secondLeg.sourcePage, t('results.openPdf'))}
        </li>
      </ol>
    </article>
  `;
}

export function renderTransferSuggestions({
  t = createTranslator('en'),
  suggestions = [],
  pdfUrl = '#',
} = {}) {
  return `
    <section class="transfer-suggestions">
      <div class="section-head">
        <h3>${escapeHtml(t('transfer.title'))}</h3>
        <p>${escapeHtml(t('transfer.subtitle'))}</p>
      </div>
      ${suggestions.length
    ? suggestions.map((suggestion) => renderSuggestion(suggestion, t, pdfUrl)).join('')
    : `<p class="transfer-unavailable">${escapeHtml(t('transfer.unavailable'))}</p>`}
    </section>
  `;
}
```

- [ ] **Step 7: Add transfer copy**

Add to every language in `src/lib/i18n.js`:

```js
'transfer.title': 'Possible one-change options',
'transfer.subtitle': 'Static PDF-derived options with at least 5 minutes to change buses.',
'transfer.wait': '{minutes} min wait',
'transfer.unavailable': 'No conservative one-change option found for this search.',
```

- [ ] **Step 8: Thread transfer renderer through no-direct fallback**

Modify `src/ui/renderNoDirectFallback.js` imports:

```js
import { renderTransferSuggestions } from './renderTransferSuggestions.js';
```

Update function signature:

```js
transferSuggestions = [],
```

Render before taxi options:

```js
${renderTransferSuggestions({ t, suggestions: transferSuggestions, pdfUrl })}
```

- [ ] **Step 9: Build transfer suggestions in main only for no-direct**

Modify `src/main.js` imports:

```js
import { findOneTransferSuggestions } from './lib/transferSuggestions.js';
```

Add helper:

```js
function currentOriginStopIds() {
  if (state.formValues.fromStopId) {
    return [state.formValues.fromStopId];
  }
  return state.localities.find((locality) => locality.id === state.formValues.fromLocalityId)?.stopIds ?? [];
}
```

In `submitCurrentSearch()`, after `buildSearchOutcome()`:

```js
if (outcome.type === 'no-direct') {
  outcome.transferSuggestions = findOneTransferSuggestions({
    trips: state.trips,
    fromStopIds: currentOriginStopIds(),
    toStopId: state.formValues.toStopId,
    dayType: state.formValues.dayType,
    now: new Date(),
  });
}
```

When calling `renderNoDirectFallback()`, pass:

```js
transferSuggestions: state.resultState.transferSuggestions ?? [],
```

- [ ] **Step 10: Add transfer styles**

Append to `styles.css`:

```css
.transfer-suggestions {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.transfer-suggestion {
  background: #ffffff;
  border: 1px solid rgba(62, 39, 24, 0.12);
  border-radius: 20px;
  padding: 18px;
}

.transfer-suggestion-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.transfer-legs {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  padding-left: 20px;
}

.transfer-legs li {
  display: grid;
  gap: 4px;
}
```

- [ ] **Step 11: Run focused tests**

Run:

```bash
npm test -- tests/lib/transferSuggestions.test.js tests/ui/renderTransferSuggestions.test.js tests/ui/renderNoDirectFallback.test.js
```

Expected: PASS.

- [ ] **Step 12: Commit transfer suggestions**

Run:

```bash
git add src/lib/transferSuggestions.js tests/lib/transferSuggestions.test.js src/ui/renderTransferSuggestions.js tests/ui/renderTransferSuggestions.test.js src/ui/renderNoDirectFallback.js tests/ui/renderNoDirectFallback.test.js src/main.js src/lib/i18n.js styles.css
git commit -m "feat: add conservative transfer suggestions"
```

## Task 5: Browse Lines And Stops

**Files:**

- Create: `src/lib/browseIndex.js`
- Create: `tests/lib/browseIndex.test.js`
- Create: `src/ui/renderBrowseView.js`
- Create: `tests/ui/renderBrowseView.test.js`
- Modify: `src/main.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`

- [ ] **Step 1: Write failing browse index tests**

Create `tests/lib/browseIndex.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildBrowseIndex } from '../../src/lib/browseIndex.js';

const stops = [
  { id: 'origin', canonical: 'Origin' },
  { id: 'middle', canonical: 'Middle' },
  { id: 'destination', canonical: 'Destination' },
];

const trips = [
  {
    lineId: '12',
    direction: 'Origin to Destination',
    dayType: 'feriale',
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:00' },
      { stopId: 'middle', name: 'Middle', time: '08:20' },
      { stopId: 'destination', name: 'Destination', time: '09:00' },
    ],
  },
  {
    lineId: '2',
    direction: 'Middle to Destination',
    dayType: 'feriale',
    stops: [
      { stopId: 'middle', name: 'Middle', time: '10:00' },
      { stopId: 'destination', name: 'Destination', time: '10:30' },
    ],
  },
];

describe('buildBrowseIndex', () => {
  it('groups lines with directions and served stops', () => {
    const index = buildBrowseIndex({ trips, stops });

    expect(index.lines).toEqual([
      {
        lineId: '12',
        directions: ['Origin to Destination'],
        stops: [
          { id: 'origin', canonical: 'Origin' },
          { id: 'middle', canonical: 'Middle' },
          { id: 'destination', canonical: 'Destination' },
        ],
      },
      {
        lineId: '2',
        directions: ['Middle to Destination'],
        stops: [
          { id: 'middle', canonical: 'Middle' },
          { id: 'destination', canonical: 'Destination' },
        ],
      },
    ]);
  });

  it('groups stops with serving lines', () => {
    const index = buildBrowseIndex({ trips, stops });

    expect(index.stops.find((stop) => stop.id === 'middle')).toEqual({
      id: 'middle',
      canonical: 'Middle',
      lines: ['12', '2'],
    });
  });
});
```

- [ ] **Step 2: Run browse index tests to verify they fail**

Run:

```bash
npm test -- tests/lib/browseIndex.test.js
```

Expected: FAIL because `src/lib/browseIndex.js` does not exist.

- [ ] **Step 3: Implement browse index module**

Create `src/lib/browseIndex.js`:

```js
function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
}

function stopLookup(stops) {
  return new Map(stops.map((stop) => [stop.id, stop]));
}

export function buildBrowseIndex({ trips = [], stops = [] } = {}) {
  const stopsById = stopLookup(stops);
  const lineMap = new Map();
  const stopLineMap = new Map();

  for (const trip of trips) {
    const line = lineMap.get(trip.lineId) ?? {
      lineId: trip.lineId,
      directions: new Set(),
      stopIds: new Set(),
    };
    line.directions.add(trip.direction);

    for (const stop of trip.stops) {
      line.stopIds.add(stop.stopId);
      const lines = stopLineMap.get(stop.stopId) ?? new Set();
      lines.add(trip.lineId);
      stopLineMap.set(stop.stopId, lines);
    }

    lineMap.set(trip.lineId, line);
  }

  const lines = [...lineMap.values()]
    .map((line) => ({
      lineId: line.lineId,
      directions: uniqueSorted([...line.directions]),
      stops: [...line.stopIds]
        .map((stopId) => stopsById.get(stopId))
        .filter(Boolean)
        .map((stop) => ({ id: stop.id, canonical: stop.canonical })),
    }))
    .sort((left, right) => left.lineId.localeCompare(right.lineId, undefined, { numeric: true }));

  const browseStops = stops
    .filter((stop) => stopLineMap.has(stop.id))
    .map((stop) => ({
      id: stop.id,
      canonical: stop.canonical,
      lines: uniqueSorted([...stopLineMap.get(stop.id)]),
    }));

  return {
    lines,
    stops: browseStops,
  };
}
```

- [ ] **Step 4: Run browse index tests**

Run:

```bash
npm test -- tests/lib/browseIndex.test.js
```

Expected: PASS.

- [ ] **Step 5: Write Browse renderer tests**

Create `tests/ui/renderBrowseView.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderBrowseView } from '../../src/ui/renderBrowseView.js';

const browseIndex = {
  lines: [
    {
      lineId: '12',
      directions: ['Origin to Destination'],
      stops: [
        { id: 'origin', canonical: 'Origin' },
        { id: 'destination', canonical: 'Destination' },
      ],
    },
  ],
  stops: [
    { id: 'origin', canonical: 'Origin', lines: ['12'] },
  ],
};

describe('renderBrowseView', () => {
  it('renders line details and search seed actions', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex,
      mode: 'lines',
      selectedLineId: '12',
    });

    expect(html).toContain('data-browse-mode="stops"');
    expect(html).toContain('data-browse-line="12"');
    expect(html).toContain('Origin to Destination');
    expect(html).toContain('data-search-from-stop="origin"');
    expect(html).toContain('data-search-to-stop="destination"');
  });

  it('renders stop details and serving lines', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex,
      mode: 'stops',
      selectedStopId: 'origin',
    });

    expect(html).toContain('data-browse-stop="origin"');
    expect(html).toContain('Line 12');
  });
});
```

- [ ] **Step 6: Implement Browse renderer**

Create `src/ui/renderBrowseView.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderStopActions(stop, t) {
  return `
    <div class="browse-stop-actions">
      <button type="button" data-search-from-stop="${escapeHtml(stop.id)}">${escapeHtml(t('browse.searchFromHere'))}</button>
      <button type="button" data-search-to-stop="${escapeHtml(stop.id)}">${escapeHtml(t('browse.searchToHere'))}</button>
    </div>
  `;
}

function renderLineDetail(line, t) {
  if (!line) {
    return `<p>${escapeHtml(t('browse.selectLine'))}</p>`;
  }
  return `
    <section class="browse-detail">
      <h3>${escapeHtml(t('results.line'))} ${escapeHtml(line.lineId)}</h3>
      <p>${escapeHtml(line.directions.join(' · '))}</p>
      <div class="browse-stop-list">
        ${line.stops.map((stop) => `
          <article class="browse-stop-row">
            <strong>${escapeHtml(stop.canonical)}</strong>
            ${renderStopActions(stop, t)}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderStopDetail(stop, t) {
  if (!stop) {
    return `<p>${escapeHtml(t('browse.selectStop'))}</p>`;
  }
  return `
    <section class="browse-detail">
      <h3>${escapeHtml(stop.canonical)}</h3>
      <p>${stop.lines.map((lineId) => `${escapeHtml(t('results.line'))} ${escapeHtml(lineId)}`).join(' · ')}</p>
      ${renderStopActions(stop, t)}
    </section>
  `;
}

export function renderBrowseView({
  t = createTranslator('en'),
  browseIndex = { lines: [], stops: [] },
  mode = 'lines',
  selectedLineId = null,
  selectedStopId = null,
} = {}) {
  const selectedLine = browseIndex.lines.find((line) => line.lineId === selectedLineId) ?? browseIndex.lines[0] ?? null;
  const selectedStop = browseIndex.stops.find((stop) => stop.id === selectedStopId) ?? browseIndex.stops[0] ?? null;

  return `
    <section class="browse-view">
      <div class="section-head">
        <h2>${escapeHtml(t('browse.title'))}</h2>
        <p>${escapeHtml(t('browse.subtitle'))}</p>
      </div>
      <div class="browse-mode-switch">
        <button type="button" data-browse-mode="lines" ${mode === 'lines' ? 'aria-current="page"' : ''}>${escapeHtml(t('browse.lines'))}</button>
        <button type="button" data-browse-mode="stops" ${mode === 'stops' ? 'aria-current="page"' : ''}>${escapeHtml(t('browse.stops'))}</button>
      </div>
      <div class="browse-layout">
        <div class="browse-list">
          ${(mode === 'lines' ? browseIndex.lines : browseIndex.stops).map((entry) => {
    const isLine = mode === 'lines';
    const id = isLine ? entry.lineId : entry.id;
    const label = isLine ? `${t('results.line')} ${entry.lineId}` : entry.canonical;
    const attr = isLine ? 'data-browse-line' : 'data-browse-stop';
    return `<button type="button" ${attr}="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }).join('')}
        </div>
        ${mode === 'lines' ? renderLineDetail(selectedLine, t) : renderStopDetail(selectedStop, t)}
      </div>
    </section>
  `;
}
```

- [ ] **Step 7: Add Browse copy**

Add to all languages in `src/lib/i18n.js`:

```js
'browse.title': 'Browse lines and stops',
'browse.subtitle': 'Choose a line or stop, then seed a route search.',
'browse.lines': 'Lines',
'browse.stops': 'Stops',
'browse.selectLine': 'Choose a line to inspect its served stops.',
'browse.selectStop': 'Choose a stop to inspect serving lines.',
'browse.searchFromHere': 'Search from here',
'browse.searchToHere': 'Search to here',
```

- [ ] **Step 8: Wire Browse in main**

Modify `src/main.js` imports:

```js
import { buildBrowseIndex } from './lib/browseIndex.js';
import { renderBrowseView } from './ui/renderBrowseView.js';
```

Extend `state`:

```js
browseIndex: { lines: [], stops: [] },
```

In `boot()`:

```js
state.browseIndex = buildBrowseIndex({ trips: bootData.trips, stops: bootData.stops });
```

In `renderApp()`:

```js
if (state.activeTab === 'browse') {
  parts.push(renderBrowseView({
    t,
    browseIndex: state.browseIndex,
    mode: state.browseState.mode,
    selectedLineId: state.browseState.lineId,
    selectedStopId: state.browseState.stopId,
  }));
}
```

Add handlers:

```js
function seedSearchStop(stopId, fieldName) {
  const stop = state.stops.find((entry) => entry.id === stopId);
  if (!stop) {
    return;
  }
  state.activeTab = 'search';
  if (fieldName === 'from') {
    selectFromStopChoice(stop);
  } else {
    state.formValues = {
      ...state.formValues,
      toInput: stop.canonical,
      toStopId: stop.id,
    };
  }
  writeRouteUrl({ push: true });
  renderApp();
  bindInteractions();
}

function bindBrowseActions() {
  document.querySelectorAll('[data-browse-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: button.dataset.browseMode ?? 'lines',
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-browse-line]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: 'lines',
        lineId: button.dataset.browseLine,
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-browse-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: 'stops',
        stopId: button.dataset.browseStop,
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-search-from-stop]').forEach((button) => {
    button.addEventListener('click', () => seedSearchStop(button.dataset.searchFromStop, 'from'));
  });

  document.querySelectorAll('[data-search-to-stop]').forEach((button) => {
    button.addEventListener('click', () => seedSearchStop(button.dataset.searchToStop, 'to'));
  });
}
```

Call `bindBrowseActions()` inside `bindInteractions()`.

- [ ] **Step 9: Add Browse styles**

Append to `styles.css`:

```css
.browse-view {
  display: grid;
  gap: 18px;
}

.browse-mode-switch,
.browse-stop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.browse-mode-switch button,
.browse-list button,
.browse-stop-actions button {
  border: 1px solid rgba(62, 39, 24, 0.12);
  border-radius: 18px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  padding: 12px 14px;
}

.browse-mode-switch [aria-current="page"] {
  background: #eb4c60;
  color: #ffffff;
}

.browse-layout {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  gap: 18px;
}

.browse-list,
.browse-detail,
.browse-stop-row {
  background: rgba(255, 251, 247, 0.84);
  border: 1px solid rgba(62, 39, 24, 0.1);
  border-radius: 22px;
  padding: 18px;
}

.browse-list,
.browse-stop-list {
  display: grid;
  gap: 10px;
}

@media (max-width: 760px) {
  .browse-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 10: Run focused tests**

Run:

```bash
npm test -- tests/lib/browseIndex.test.js tests/ui/renderBrowseView.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit Browse**

Run:

```bash
git add src/lib/browseIndex.js tests/lib/browseIndex.test.js src/ui/renderBrowseView.js tests/ui/renderBrowseView.test.js src/main.js src/lib/i18n.js styles.css
git commit -m "feat: add line and stop browser"
```

## Task 6: Offline PWA

**Files:**

- Create: `manifest.webmanifest`
- Create: `service-worker.js`
- Create: `src/lib/registerServiceWorker.js`
- Create: `tests/lib/registerServiceWorker.test.js`
- Modify: `index.html`
- Modify: `src/main.js`

- [ ] **Step 1: Write failing service worker registration tests**

Create `tests/lib/registerServiceWorker.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../src/lib/registerServiceWorker.js';

describe('registerServiceWorker', () => {
  it('registers the service worker when supported', async () => {
    const register = vi.fn().mockResolvedValue({});
    const navigatorObject = {
      serviceWorker: { register },
    };

    await registerServiceWorker({ navigatorObject });

    expect(register).toHaveBeenCalledWith('./service-worker.js');
  });

  it('does nothing when service workers are unsupported', async () => {
    await expect(registerServiceWorker({ navigatorObject: {} })).resolves.toBe(false);
  });

  it('returns false when registration fails', async () => {
    const navigatorObject = {
      serviceWorker: {
        register: vi.fn().mockRejectedValue(new Error('blocked')),
      },
    };

    await expect(registerServiceWorker({ navigatorObject })).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run service worker helper tests to verify they fail**

Run:

```bash
npm test -- tests/lib/registerServiceWorker.test.js
```

Expected: FAIL because `src/lib/registerServiceWorker.js` does not exist.

- [ ] **Step 3: Implement service worker registration helper**

Create `src/lib/registerServiceWorker.js`:

```js
export async function registerServiceWorker({
  navigatorObject = window.navigator,
  scriptUrl = './service-worker.js',
} = {}) {
  if (!navigatorObject.serviceWorker?.register) {
    return false;
  }

  try {
    await navigatorObject.serviceWorker.register(scriptUrl);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
```

- [ ] **Step 4: Run registration tests**

Run:

```bash
npm test -- tests/lib/registerServiceWorker.test.js
```

Expected: PASS.

- [ ] **Step 5: Add manifest**

Create `manifest.webmanifest`:

```json
{
  "name": "Riviera Trasporti Ricerca Percorsi",
  "short_name": "RT Percorsi",
  "description": "Route-first lookup for Riviera Trasporti timetable data.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f1ea",
  "theme_color": "#eb4c60",
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
  ]
}
```

- [ ] **Step 6: Add service worker**

Create `service-worker.js`:

```js
const CACHE_NAME = 'riviera-route-tools-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './src/main.js',
  './manifest.webmanifest',
  './assets/brand/favicon-32x32.png',
  './assets/brand/favicon-16x16.png',
  './assets/brand/apple-touch-icon.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png',
  './assets/data/trips.json',
  './assets/data/stops.json',
  './assets/data/lines.json',
  './assets/data/metadata.json',
  './assets/data/localities.json',
  './assets/data/reachability.json',
  './assets/data/stop-coordinates.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((url) =>
        cache.add(url).catch(() => null)))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)))),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached ?? fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone))
            .catch(() => null);
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cached;
        })),
  );
});
```

- [ ] **Step 7: Link manifest in index**

Modify `index.html` head:

```html
    <link rel="manifest" href="./manifest.webmanifest" />
    <meta name="theme-color" content="#eb4c60" />
```

Place these near existing icon links.

- [ ] **Step 8: Register service worker in main**

Modify `src/main.js` imports:

```js
import { registerServiceWorker } from './lib/registerServiceWorker.js';
```

Call it after the successful `renderApp()` and `bindInteractions()` calls in `boot()` so registration does not block first render:

```js
registerServiceWorker();
```

- [ ] **Step 9: Run focused tests**

Run:

```bash
npm test -- tests/lib/registerServiceWorker.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit PWA support**

Run:

```bash
git add manifest.webmanifest service-worker.js src/lib/registerServiceWorker.js tests/lib/registerServiceWorker.test.js index.html src/main.js
git commit -m "feat: add offline app shell"
```

## Task 7: Integration Polish And Verification

**Files:**

- No planned file modifications before verification starts.
- Modify only the specific source or test file identified by a failing focused test.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Fix integration failures with focused tests first**

For every failing test, follow this loop:

```bash
npm test -- tests/path/to/failing.test.js
```

Expected before fix: FAIL with the current assertion or runtime error.

Make the smallest implementation change that preserves the plan contracts, then rerun the focused test until it passes.

- [ ] **Step 3: Check translation coverage**

Run:

```bash
npm test -- tests/lib/i18n.test.js
```

Expected: PASS. If the test reports missing keys, add the same key to every language dictionary.

- [ ] **Step 4: Start a local static server**

Run:

```bash
python3 -m http.server 4173
```

Expected: server starts at `http://localhost:4173`.

- [ ] **Step 5: Browser verify direct search**

Open `http://localhost:4173`.

Manual checks:

- Search tab is active by default.
- Select a known direct route such as `Porto Maurizio` to `Sanremo Autostazione`.
- Submit search.
- Results show route summary, next/all departures, save/share buttons, and no duplicate taxi panels.
- URL contains `tab=search`, `from`, `to`, and `day`.

- [ ] **Step 6: Browser verify Saved**

Manual checks:

- Click save route from a result.
- Open Saved.
- The route appears under Favorites.
- Submit another route.
- The route appears under Recent searches.
- Clicking either restored entry opens Search with fields restored.

- [ ] **Step 7: Browser verify no-direct recovery and transfers**

Manual checks:

- Search a pair with no direct route.
- No-direct panel shows clickable recovery buttons.
- Clicking a recovery suggestion updates Search state.
- Transfer area either shows up to 3 conservative one-change suggestions or the unavailable message.
- Transfer suggestions include line ids, times, transfer stop, wait minutes, total duration, and PDF links.

- [ ] **Step 8: Browser verify Browse**

Manual checks:

- Open Browse.
- Switch between Lines and Stops.
- Select a line and inspect served stops.
- Click Search from here from a stop.
- Search opens with From filled.
- Return to Browse, choose Search to here.
- Search opens with To filled.
- URL preserves `tab=browse`, `browse`, and selected line/stop when browsing.

- [ ] **Step 9: Browser verify shared URLs**

Manual checks:

- Copy a Search URL with selected route state.
- Reload the page.
- Fields and active tab restore.
- Copy a Browse URL with selected line or stop.
- Reload the page.
- Browse mode and selected item restore.

- [ ] **Step 10: Browser verify PWA cache**

Manual checks:

- Load the app once on `http://localhost:4173`.
- Confirm the service worker is registered in browser devtools if available.
- Stop the local server only if the browser keeps the page available through service worker cache in this environment.
- Reload.
- App shell and cached JSON-backed route lookup remain available, while live maps/geolocation may fail gracefully.

- [ ] **Step 11: Run full tests again**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 12: Final commit**

If integration fixes changed files after Task 6, commit them:

```bash
git add src/main.js src/lib/i18n.js styles.css tests
git commit -m "chore: verify connected route tools integration"
```

If there were no integration fixes, do not create an empty commit.

## Self-Review Notes

- Spec coverage: Tasks cover URL state, tabs, Saved, clickable no-direct recovery, conservative one-transfer suggestions, Browse, PWA, and browser verification.
- Scope: The plan preserves the direct-route default and uses one-transfer suggestions only in no-direct recovery.
- Type consistency: Route state uses `fromInput`, `fromLocalityId`, `fromStopId`, `toInput`, `toStopId`, and `dayType` consistently across URL, saved routes, and main state.
- Test discipline: Every behavior task starts with focused failing tests, then implementation, then focused tests, then commit.
