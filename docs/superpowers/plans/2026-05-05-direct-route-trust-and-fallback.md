# Direct-Route Trust And Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement trust-focused direct-route improvements: smarter day-type defaults, honest end-of-service summaries, structured no-direct fallback guidance, and generated dataset freshness metadata.

**Architecture:** Thread official PDF metadata through the static build into a generated `metadata.json` asset, introduce small pure helpers for service-day and search-outcome logic, then update the shell/results renderers and main runtime to consume those outputs without expanding into transfer planning.

**Tech Stack:** Node.js build scripts, vanilla JavaScript modules, Vitest, GitHub Pages static assets.

---

## File Structure

- `scripts/lib/pdfSource.mjs`
  Own the official PDF title, URL, and effective date in one shared build-time module.
- `scripts/fetch-pdf.mjs`
  Fetch the official PDF using shared source metadata.
- `scripts/build-route-data.mjs`
  Generate `assets/data/metadata.json` alongside existing timetable assets.
- `tests/scripts/buildRouteData.test.js`
  Lock metadata generation and coverage counts.
- `src/lib/serviceDay.js`
  Centralize weekday-to-day-type defaults and “remaining departures today” logic.
- `src/lib/searchOutcome.js`
  Convert direct-trip matches into explicit runtime outcomes: results, service-ended results, or no-direct fallback.
- `tests/lib/serviceDay.test.js`
  Verify date-aware defaults and same-day departure filtering.
- `tests/lib/searchOutcome.test.js`
  Verify summary priorities, ended-service states, and fallback suggestions.
- `src/ui/renderShell.js`
  Render a dataset freshness marker from generated metadata.
- `src/ui/renderResults.js`
  Render decision-first metrics and use runtime PDF metadata instead of a hardcoded constant.
- `src/ui/renderNoDirectFallback.js`
  Render the dedicated no-direct fallback panel.
- `tests/ui/renderShell.test.js`
  Verify freshness rendering and shell trust copy.
- `tests/ui/renderResults.test.js`
  Verify the revised summary layout and runtime PDF URL usage.
- `tests/ui/renderNoDirectFallback.test.js`
  Verify the structured no-direct fallback panel.
- `src/lib/i18n.js`
  Add trust, ended-service, and fallback strings.
- `styles.css`
  Style the freshness marker, revised summary metrics, and fallback panel.
- `src/lib/appBootstrap.js`
  Load generated assets and normalize boot data for `main.js`.
- `tests/lib/appBootstrap.test.js`
  Verify metadata loading and date-aware initial form defaults.
- `src/main.js`
  Replace inline summary branching with helper-driven outcomes and boot metadata loading.

### Task 1: Generate And Persist Dataset Metadata

**Files:**
- Create: `scripts/lib/pdfSource.mjs`
- Modify: `scripts/fetch-pdf.mjs`
- Modify: `scripts/build-route-data.mjs`
- Test: `tests/scripts/buildRouteData.test.js`

- [ ] **Step 1: Write the failing test**

Add a metadata assertion to `tests/scripts/buildRouteData.test.js`:

```js
it('builds metadata with source freshness and indexed coverage counts', async () => {
  const output = await buildRouteData({
    indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
    manifestEntries: [
      {
        lineId: '12',
        pageNumber: 23,
        direction: 'ANDORA - IMPERIA - SANREMO',
        dayType: 'feriale',
        parserFamily: 'linear-intercity',
      },
    ],
    pages: [
      {
        pageNumber: 23,
        text: `Andora Stazione FS 05.35
Imperia Porto Maurizio 06.20
Sanremo Autostazione 07.00`,
        items: [],
      },
    ],
    aliases: {},
    localities: [],
    builtAt: '2026-05-05T08:30:00.000Z',
  });

  expect(output.metadata).toMatchObject({
    source: {
      title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
      url: expect.stringContaining('2025-2026_Orario_Invernale_Generale'),
      effectiveDate: '2026-04-01',
    },
    builtAt: '2026-05-05T08:30:00.000Z',
    coverage: {
      indexedPageCount: 1,
      manifestPageCount: 1,
    },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/scripts/buildRouteData.test.js
```

Expected: FAIL with a message similar to `expected undefined to match object` because `output.metadata` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/lib/pdfSource.mjs`:

```js
export const PDF_SOURCE_METADATA = {
  title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
  url: 'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf',
  effectiveDate: '2026-04-01',
};
```

Update `scripts/fetch-pdf.mjs` to import the shared URL:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { PDF_SOURCE_METADATA } from './lib/pdfSource.mjs';

const outputDir = new URL('../build/source/', import.meta.url);
const outputFile = new URL('../build/source/riviera.pdf', import.meta.url);

await mkdir(outputDir, { recursive: true });

const response = await fetch(PDF_SOURCE_METADATA.url);

if (!response.ok) {
  throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
await writeFile(outputFile, bytes);
```

Update `scripts/build-route-data.mjs` so `buildRouteData()` returns metadata and the CLI writes `assets/data/metadata.json`:

```js
import { PDF_SOURCE_METADATA } from './lib/pdfSource.mjs';

function buildDatasetMetadata({ indexEntries, manifestEntries, builtAt }) {
  return {
    source: PDF_SOURCE_METADATA,
    builtAt,
    coverage: {
      indexedPageCount: indexEntries.length,
      manifestPageCount: manifestEntries.length,
    },
  };
}

export async function buildRouteData({
  indexEntries,
  manifestEntries,
  pages,
  aliases,
  localities = [],
  builtAt = new Date().toISOString(),
}) {
  // existing validation + trip generation stays in place

  return {
    lines: buildLines(manifestEntries),
    stops,
    trips,
    localities: validatedLocalities,
    reachability: buildReachability(trips),
    metadata: buildDatasetMetadata({ indexEntries, manifestEntries, builtAt }),
  };
}

await writeFile(
  new URL('../assets/data/metadata.json', import.meta.url),
  JSON.stringify(output.metadata, null, 2),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/scripts/buildRouteData.test.js
```

Expected: PASS for all `buildRouteData` tests, including the new metadata assertion.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/pdfSource.mjs scripts/fetch-pdf.mjs scripts/build-route-data.mjs tests/scripts/buildRouteData.test.js
git commit -m "feat: generate dataset metadata for timetable builds"
```

### Task 2: Add Service-Day And Search-Outcome Helpers

**Files:**
- Create: `src/lib/serviceDay.js`
- Create: `src/lib/searchOutcome.js`
- Test: `tests/lib/serviceDay.test.js`
- Test: `tests/lib/searchOutcome.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/serviceDay.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { defaultDayTypeForDate, splitRemainingDepartures } from '../../src/lib/serviceDay.js';

describe('defaultDayTypeForDate', () => {
  it('defaults weekdays to feriale, Saturday to sabato, and Sunday to festivo', () => {
    expect(defaultDayTypeForDate(new Date('2026-05-04T09:00:00'))).toBe('feriale');
    expect(defaultDayTypeForDate(new Date('2026-05-09T09:00:00'))).toBe('sabato');
    expect(defaultDayTypeForDate(new Date('2026-05-10T09:00:00'))).toBe('festivo');
  });
});

describe('splitRemainingDepartures', () => {
  it('marks service as ended when all direct trips have already departed', () => {
    const matches = [
      { departureTime: '06:20', arrivalTime: '07:00' },
      { departureTime: '07:10', arrivalTime: '07:45' },
    ];

    expect(
      splitRemainingDepartures(matches, new Date('2026-05-04T21:00:00')),
    ).toMatchObject({
      remaining: [],
      serviceEnded: true,
    });
  });
});
```

Create `tests/lib/searchOutcome.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildSearchOutcome } from '../../src/lib/searchOutcome.js';

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'Imperia Porto Maurizio' },
  { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'Imperia Porto Maurizio Piazza Dante' },
  { id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione' },
];

const localities = [
  {
    id: 'porto-maurizio',
    label: 'Porto Maurizio',
    aliases: ['Imperia Porto Maurizio'],
    stopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
  },
];

describe('buildSearchOutcome', () => {
  it('builds a decision-first summary when future departures remain', () => {
    const matches = [
      {
        lineId: '12',
        departureTime: '16:45',
        arrivalTime: '17:25',
        durationMinutes: 40,
        sourcePage: 23,
      },
      {
        lineId: '12',
        departureTime: '18:10',
        arrivalTime: '18:50',
        durationMinutes: 40,
        sourcePage: 23,
      },
    ];

    const outcome = buildSearchOutcome({
      matches,
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      localities,
      reachability: {},
      stops,
    });

    expect(outcome).toMatchObject({
      type: 'results',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '18:10',
        averageDurationMinutes: 40,
        lines: ['12'],
      },
    });
  });

  it('returns a no-direct fallback with alternate origin stop suggestions', () => {
    const outcome = buildSearchOutcome({
      matches: [],
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      fromStopId: 'imperia-porto-maurizio',
      localities,
      reachability: {
        'imperia-porto-maurizio': [],
        'imperia-porto-maurizio-piazza-dante': ['sanremo-autostazione'],
      },
      stops,
    });

    expect(outcome).toMatchObject({
      type: 'no-direct',
      suggestions: [
        {
          kind: 'origin-stop',
          stopId: 'imperia-porto-maurizio-piazza-dante',
          label: 'Imperia Porto Maurizio Piazza Dante',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/lib/serviceDay.test.js tests/lib/searchOutcome.test.js
```

Expected: FAIL with module resolution errors because `src/lib/serviceDay.js` and `src/lib/searchOutcome.js` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/serviceDay.js`:

```js
import { toMinutes } from './time.js';

export function defaultDayTypeForDate(now = new Date()) {
  const weekday = now.getDay();

  if (weekday === 0) {
    return 'festivo';
  }

  if (weekday === 6) {
    return 'sabato';
  }

  return 'feriale';
}

export function splitRemainingDepartures(matches, now = new Date()) {
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  const remaining = matches.filter((match) => toMinutes(match.departureTime) >= nowMinutes);

  return {
    remaining,
    serviceEnded: matches.length > 0 && remaining.length === 0,
  };
}
```

Create `src/lib/searchOutcome.js`:

```js
import { splitRemainingDepartures } from './serviceDay.js';
import { toMinutes } from './time.js';

function averageDuration(matches) {
  return Math.round(
    matches.reduce((sum, match) => sum + match.durationMinutes, 0) / matches.length,
  );
}

function uniqueLines(matches) {
  return [...new Set(matches.map((match) => match.lineId))];
}

function buildFallbackSuggestions({ fromLocalityId, fromStopId, localities, reachability, stops }) {
  if (!fromLocalityId) {
    return [];
  }

  const locality = localities.find((entry) => entry.id === fromLocalityId);

  if (!locality) {
    return [];
  }

  if (fromStopId) {
    return locality.stopIds
      .filter((stopId) => stopId !== fromStopId)
      .filter((stopId) => (reachability[stopId] ?? []).length > 0)
      .map((stopId) => stops.find((stop) => stop.id === stopId))
      .filter(Boolean)
      .map((stop) => ({
        kind: 'origin-stop',
        stopId: stop.id,
        label: stop.canonical,
      }))
      .slice(0, 3);
  }

  return locality.stopIds
    .flatMap((stopId) => reachability[stopId] ?? [])
    .filter((stopId, index, allIds) => allIds.indexOf(stopId) === index)
    .map((stopId) => stops.find((stop) => stop.id === stopId))
    .filter(Boolean)
    .map((stop) => ({
      kind: 'destination-stop',
      stopId: stop.id,
      label: stop.canonical,
    }))
    .slice(0, 3);
}

export function buildSearchOutcome({
  matches,
  now = new Date(),
  fromLocalityId = null,
  fromStopId = null,
  localities = [],
  reachability = {},
  stops = [],
}) {
  if (!matches.length) {
    return {
      type: 'no-direct',
      suggestions: buildFallbackSuggestions({
        fromLocalityId,
        fromStopId,
        localities,
        reachability,
        stops,
      }),
    };
  }

  const { remaining, serviceEnded } = splitRemainingDepartures(matches, now);
  const remainingByArrival = [...remaining].sort(
    (left, right) => toMinutes(left.arrivalTime) - toMinutes(right.arrivalTime),
  );

  return {
    type: 'results',
    summary: {
      serviceEnded,
      nextDeparture: remaining[0] ?? null,
      soonestArrival: remainingByArrival[0] ?? null,
      lastDepartureTime: matches.at(-1)?.departureTime ?? null,
      averageDurationMinutes: averageDuration(matches),
      lines: uniqueLines(matches),
    },
    nextDepartures: remaining.slice(0, 3),
    allDepartures: matches,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/lib/serviceDay.test.js tests/lib/searchOutcome.test.js
```

Expected: PASS for all new helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/serviceDay.js src/lib/searchOutcome.js tests/lib/serviceDay.test.js tests/lib/searchOutcome.test.js
git commit -m "feat: add trusted service-day and search outcome helpers"
```

### Task 3: Render Freshness, Decision-First Results, And No-Direct Fallback

**Files:**
- Create: `src/ui/renderNoDirectFallback.js`
- Modify: `src/ui/renderShell.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`
- Test: `tests/ui/renderNoDirectFallback.test.js`
- Test: `tests/ui/renderShell.test.js`
- Test: `tests/ui/renderResults.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/renderNoDirectFallback.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderNoDirectFallback } from '../../src/ui/renderNoDirectFallback.js';

describe('renderNoDirectFallback', () => {
  it('renders transfer guidance, PDF link, and alternate stop suggestions', () => {
    const html = renderNoDirectFallback({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      suggestions: [
        {
          kind: 'origin-stop',
          stopId: 'imperia-porto-maurizio-piazza-dante',
          label: 'Imperia Porto Maurizio Piazza Dante',
        },
      ],
    });

    expect(html).toContain('No direct ride found');
    expect(html).toContain('This journey may still require a transfer');
    expect(html).toContain('Imperia Porto Maurizio Piazza Dante');
    expect(html).toContain('https://example.com/riviera.pdf');
  });
});
```

Update `tests/ui/renderShell.test.js` with a freshness assertion:

```js
it('renders the dataset freshness marker when metadata is available', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'en',
    languages: SUPPORTED_LANGUAGES,
    datasetInfo: {
      source: {
        title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
        effectiveDate: '2026-04-01',
      },
      builtAt: '2026-05-05T08:30:00.000Z',
    },
    t: createTranslator('en'),
  });

  expect(html).toContain('Updated from official PDF');
  expect(html).toContain('2026-04-01');
  expect(html).toContain('2026-05-05');
});
```

Replace the summary assertion in `tests/ui/renderResults.test.js` with a decision-first version:

```js
it('renders decision-first summary metrics and uses the runtime PDF URL', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    pdfUrl: 'https://example.com/riviera.pdf',
    summary: {
      serviceEnded: false,
      nextDeparture: { departureTime: '16:45' },
      soonestArrival: { arrivalTime: '17:25' },
      lastDepartureTime: '19:45',
      averageDurationMinutes: 39,
      lines: ['12'],
    },
    nextDepartures: [
      {
        departureTime: '16:45',
        arrivalTime: '17:25',
        durationMinutes: 40,
        lineId: '12',
        sourcePage: 23,
      },
    ],
    allDepartures: [],
  });

  expect(html).toContain('Next departure');
  expect(html).toContain('Soonest arrival');
  expect(html).toContain('Last departure today');
  expect(html).toContain('Average duration');
  expect(html).toContain('https://example.com/riviera.pdf#page=23');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js tests/ui/renderResults.test.js
```

Expected: FAIL because `renderNoDirectFallback.js` does not exist and the current shell/results renderers do not expose freshness or decision-first labels.

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/renderNoDirectFallback.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderNoDirectFallback({
  t = createTranslator('en'),
  routeLabel,
  pdfUrl,
  suggestions = [],
}) {
  return `
    <section class="empty-state empty-state--fallback">
      <p class="eyebrow">${escapeHtml(t('empty.eyebrow'))}</p>
      <h2>${escapeHtml(t('empty.noDirectTitle'))}</h2>
      <p>${escapeHtml(routeLabel)}</p>
      <p>${escapeHtml(t('empty.transferNote'))}</p>
      <div class="fallback-actions">
        <a class="topbar-link" href="${pdfUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPdf'))}</a>
      </div>
      <div class="fallback-suggestions">
        ${suggestions.map((suggestion) => `<span class="picker-panel-tag">${escapeHtml(suggestion.label)}</span>`).join('')}
      </div>
    </section>
  `;
}
```

Update `src/ui/renderShell.js` to accept `datasetInfo`:

```js
function renderFreshnessMarker(datasetInfo, t) {
  if (!datasetInfo?.source) {
    return '';
  }

  return `
    <p class="dataset-freshness">
      ${t('shell.dataFreshness')}
      ${datasetInfo.source.effectiveDate}
      · ${datasetInfo.builtAt.slice(0, 10)}
    </p>
  `;
}

export function renderShell(content, { language = 'en', languages = SUPPORTED_LANGUAGES, datasetInfo = null, t = createTranslator('en') } = {}) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <img class="brand-lockup-image" src="${BRAND_LOCKUP_SRC}" alt="${BRAND_LOCKUP_ALT}" />
          <p class="brand-subtitle">${t('shell.subtitle')}</p>
          ${renderFreshnessMarker(datasetInfo, t)}
        </div>
        ...
      </header>
      ${content}
    </div>
  `;
}
```

Update `src/ui/renderResults.js` to remove the hardcoded PDF constant and render the revised summary:

```js
function renderSummaryMetrics(summary, t) {
  return `
    <div class="metrics">
      <div class="metric">
        <span>${summary.serviceEnded ? t('results.noMoreDeparturesToday') : t('results.nextDeparture')}</span>
        <strong>${summary.nextDeparture?.departureTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.soonestArrival')}</span>
        <strong>${summary.soonestArrival?.arrivalTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.lastDepartureToday')}</span>
        <strong>${summary.lastDepartureTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.averageDuration')}</span>
        <strong>${summary.averageDurationMinutes} min</strong>
      </div>
    </div>
  `;
}

function renderDepartureCard(departure, t, pdfUrl) {
  return `
    <article class="${departure.isSelected ? 'departure-card departure-card--selected' : 'departure-card'}" data-trip-key="${departure.tripKey ?? ''}">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <span>${t('results.showTripMap')}</span>
        <a href="${pdfUrl}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
      </div>
    </article>
  `;
}
```

Add i18n keys in `src/lib/i18n.js` for:

```js
'shell.dataFreshness': 'Updated from official PDF ',
'results.nextDeparture': 'Next departure',
'results.soonestArrival': 'Soonest arrival',
'results.lastDepartureToday': 'Last departure today',
'results.averageDuration': 'Average duration',
'results.noMoreDeparturesToday': 'No more departures today',
'empty.noDirectTitle': 'No direct ride found',
'empty.transferNote': 'This journey may still require a transfer outside this direct-route tool.',
```

Add CSS in `styles.css`:

```css
.dataset-freshness {
  margin: 0.4rem 0 0;
  color: var(--color-muted, #6b6258);
  font-size: 0.85rem;
}

.empty-state--fallback {
  display: grid;
  gap: 0.9rem;
}

.fallback-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.metrics {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js tests/ui/renderResults.test.js
```

Expected: PASS for the new fallback renderer and the updated shell/results rendering tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/renderNoDirectFallback.js src/ui/renderShell.js src/ui/renderResults.js src/lib/i18n.js styles.css tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js tests/ui/renderResults.test.js
git commit -m "feat: render trust metadata and direct-route fallback states"
```

### Task 4: Integrate Metadata Loading And Helper-Driven Search Flow

**Files:**
- Create: `src/lib/appBootstrap.js`
- Modify: `src/main.js`
- Test: `tests/lib/appBootstrap.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/appBootstrap.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { loadAppBootstrapData } from '../../src/lib/appBootstrap.js';

describe('loadAppBootstrapData', () => {
  it('loads generated metadata and derives the initial day type from the current date', async () => {
    const jsonByUrl = {
      './assets/data/trips.json': [],
      './assets/data/stops.json': [],
      './assets/data/localities.json': [],
      './assets/data/reachability.json': {},
      './assets/data/metadata.json': {
        source: {
          title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
          url: 'https://example.com/riviera.pdf',
          effectiveDate: '2026-04-01',
        },
        builtAt: '2026-05-05T08:30:00.000Z',
        coverage: {
          indexedPageCount: 88,
          manifestPageCount: 88,
        },
      },
    };

    const fetchJson = async (url) => jsonByUrl[url];
    const fetchJsonOrNull = async (url) => jsonByUrl[url] ?? null;

    const data = await loadAppBootstrapData({
      fetchJson,
      fetchJsonOrNull,
      now: new Date('2026-05-10T09:00:00'),
    });

    expect(data.metadata.source.url).toBe('https://example.com/riviera.pdf');
    expect(data.formValues.dayType).toBe('festivo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/lib/appBootstrap.test.js
```

Expected: FAIL with a module resolution error because `src/lib/appBootstrap.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/appBootstrap.js`:

```js
import { defaultDayTypeForDate } from './serviceDay.js';

export async function loadAppBootstrapData({
  fetchJson,
  fetchJsonOrNull,
  now = new Date(),
}) {
  const [trips, stops, generatedLocalities, generatedReachability, metadata] = await Promise.all([
    fetchJson('./assets/data/trips.json'),
    fetchJson('./assets/data/stops.json'),
    fetchJsonOrNull('./assets/data/localities.json'),
    fetchJsonOrNull('./assets/data/reachability.json'),
    fetchJsonOrNull('./assets/data/metadata.json'),
  ]);

  return {
    trips,
    stops,
    localities: generatedLocalities ?? [],
    reachability: generatedReachability ?? {},
    metadata,
    formValues: {
      fromInput: '',
      fromLocalityId: null,
      fromStopId: null,
      toInput: '',
      toStopId: null,
      dayType: defaultDayTypeForDate(now),
    },
  };
}
```

Update `src/main.js` to use the new helpers:

```js
import { loadAppBootstrapData } from './lib/appBootstrap.js';
import { buildSearchOutcome } from './lib/searchOutcome.js';
import { renderNoDirectFallback } from './ui/renderNoDirectFallback.js';

const state = {
  trips: [],
  stops: [],
  localities: [],
  reachability: {},
  aliases: {},
  metadata: null,
  language: readStoredLanguage(window.localStorage),
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

function renderApp() {
  const t = createTranslator(state.language);
  const parts = [renderSearchForm({ ... })];

  if (state.resultState?.type === 'results') {
    parts.push(renderResultsView({
      t,
      routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
      pdfUrl: state.metadata?.source?.url ?? '#',
      summary: state.resultState.summary,
      nextDepartures: state.resultState.nextDepartures,
      allDepartures: state.resultState.allDepartures,
      selectedTripKey: state.resultState.selectedTripKey,
      selectedTripPanel: state.resultState.selectedTripPanel ?? '',
    }));
  }

  if (state.resultState?.type === 'no-direct') {
    parts.push(renderNoDirectFallback({
      t,
      routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
      pdfUrl: state.metadata?.source?.url ?? '#',
      suggestions: state.resultState.suggestions,
    }));
  }

  app.innerHTML = renderShell(parts.join(''), {
    language: state.language,
    languages: SUPPORTED_LANGUAGES,
    datasetInfo: state.metadata,
    t,
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  ...

  const matches = findDirectTrips({ ... });

  state.resultState = buildSearchOutcome({
    matches,
    now: new Date(),
    fromLocalityId: state.formValues.fromLocalityId,
    fromStopId: state.formValues.fromStopId,
    localities: state.localities,
    reachability: state.reachability,
    stops: state.stops,
  });
  renderApp();
  bindInteractions();
});

const bootData = await loadAppBootstrapData({
  fetchJson: (url) => fetch(url).then((response) => response.json()),
  fetchJsonOrNull,
});

state.trips = bootData.trips;
state.stops = bootData.stops;
state.localities = bootData.localities;
state.reachability = bootData.reachability;
state.metadata = bootData.metadata;
state.formValues = bootData.formValues;
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm test -- tests/lib/appBootstrap.test.js tests/lib/serviceDay.test.js tests/lib/searchOutcome.test.js tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js tests/ui/renderResults.test.js tests/scripts/buildRouteData.test.js
```

Expected: PASS for the boot loader, helper, UI, and build tests covering this feature slice.

- [ ] **Step 5: Commit**

```bash
git add src/lib/appBootstrap.js src/main.js tests/lib/appBootstrap.test.js
git commit -m "feat: wire trusted search outcomes into app runtime"
```

## Self-Review

- Spec coverage:
  - no-direct fallback: covered by Task 2 outcome modeling and Task 3 fallback UI
  - smarter day-type defaults: covered by Task 2 helper and Task 4 bootstrap integration
  - honest end-of-service summaries: covered by Task 2 remaining-departure logic and Task 3 results rendering
  - freshness metadata: covered by Task 1 build pipeline and Task 3 shell/results rendering
- Placeholder scan:
  - no placeholder markers or deferred-implementation notes remain
  - every task includes exact file paths, code snippets, commands, and expected outcomes
- Type consistency:
  - `metadata.source.url`, `metadata.source.title`, `metadata.source.effectiveDate`, and `metadata.builtAt` are used consistently
  - `summary.lastDepartureTime` is named consistently between helper tests, renderer tests, and renderer implementation
  - outcome types are consistently `results` and `no-direct`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-05-direct-route-trust-and-fallback.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
