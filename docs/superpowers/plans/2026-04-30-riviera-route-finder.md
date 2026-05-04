# Riviera Trasporti Route Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-friendly web app that lets users search direct Riviera Trasporti routes like Porto Maurizio to Sanremo, then see next departures, the full timetable for a selected day type, and average travel time.

**Architecture:** Use a static-site architecture with a Node build pipeline that downloads and extracts the official PDF into normalized JSON, then serve a vanilla JavaScript frontend that loads those JSON files and performs direct-route lookup in the browser. Keep parsing config-driven so the PDF remains the source of truth while stop aliases and page hints stay maintainable.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, Node.js 22+, `pdfjs-dist`, `vitest`, GitHub Pages

---

## File Map

- `package.json`: scripts and development dependencies.
- `index.html`: app shell for the static site.
- `styles.css`: Apple-influenced layout, typography, glass surfaces, responsive behavior.
- `src/main.js`: bootstraps app state, loads JSON, wires events.
- `src/lib/normalize.js`: stop-name normalization and alias matching.
- `src/lib/time.js`: timetable time parsing, sorting, duration math.
- `src/lib/query.js`: direct-trip filtering, next departures, route summaries.
- `src/ui/renderSearchForm.js`: route search form markup.
- `src/ui/renderResults.js`: summary cards, next departures, full timetable markup.
- `src/ui/renderEmptyState.js`: no-results and ambiguous-stop states.
- `scripts/fetch-pdf.mjs`: downloads the official Riviera Trasporti PDF into a local cache.
- `scripts/extract-pages.mjs`: extracts raw page text from the PDF.
- `scripts/build-route-data.mjs`: transforms raw pages plus manual config into static JSON assets.
- `scripts/lib/parseTimetablePage.mjs`: config-driven parser for timetable pages.
- `data/manual/line-pages.json`: line ids, page ranges, direction labels, day-type hints.
- `data/manual/stop-aliases.json`: canonical stop names and known aliases.
- `assets/data/lines.json`: generated line metadata for the app.
- `assets/data/stops.json`: generated canonical stop list and aliases.
- `assets/data/trips.json`: generated trip records for direct route lookup.
- `tests/lib/normalize.test.js`: normalization and alias tests.
- `tests/lib/query.test.js`: direct-route query and route-summary tests.
- `tests/scripts/parseTimetablePage.test.js`: timetable parser tests using fixture text.
- `tests/ui/renderResults.test.js`: rendering tests for the result view.
- `tests/fixtures/line12-andora-imperia-sanremo.txt`: fixture based on the line 12 timetable structure from the April 1, 2026 PDF.
- `README.md`: local development, data build, and GitHub Pages deployment notes.
- `.github/workflows/deploy.yml`: optional Pages deployment workflow if deployment is automated.

### Task 1: Scaffold The Static App And Core Utility Modules

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/lib/normalize.js`
- Create: `src/lib/time.js`
- Create: `tests/lib/normalize.test.js`

- [ ] **Step 1: Write the failing normalization test**

```js
// tests/lib/normalize.test.js
import { describe, expect, it } from 'vitest';
import { durationBetween, normalizeStopName, toMinutes } from '../../src/lib/time.js';
import { applyStopAliases, canonicalizeStopName } from '../../src/lib/normalize.js';

describe('stop normalization', () => {
  const aliases = {
    'imperia porto maurizio': ['porto maurizio', 'imperia p. maurizio'],
    'sanremo autostazione': ['sanremo', 'autostazione sanremo'],
  };

  it('canonicalizes common stop aliases', () => {
    expect(canonicalizeStopName('Imperia P. Maurizio', aliases)).toBe('imperia porto maurizio');
    expect(canonicalizeStopName('Sanremo', aliases)).toBe('sanremo autostazione');
  });

  it('normalizes spacing and punctuation before alias lookup', () => {
    expect(applyStopAliases(' Porto  Maurizio ', aliases)).toBe('imperia porto maurizio');
  });

  it('parses timetable times and durations', () => {
    expect(toMinutes('06:45')).toBe(405);
    expect(durationBetween('16:45', '17:25')).toBe(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/normalize.test.js`
Expected: FAIL with module-not-found errors for `src/lib/time.js` and `src/lib/normalize.js`

- [ ] **Step 3: Write minimal project scaffold and utility implementation**

```json
{
  "name": "riviera-trasporti-schedules",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build:data": "node scripts/fetch-pdf.mjs && node scripts/extract-pages.mjs && node scripts/build-route-data.mjs"
  },
  "devDependencies": {
    "pdfjs-dist": "^5.4.54",
    "vitest": "^3.2.4"
  }
}
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Riviera Transit</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
```

```js
// src/lib/normalize.js
export function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function applyStopAliases(rawValue, aliases) {
  const normalized = normalizeText(rawValue);

  for (const [canonical, variants] of Object.entries(aliases)) {
    if (canonical === normalized || variants.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function canonicalizeStopName(rawValue, aliases) {
  return applyStopAliases(rawValue, aliases);
}
```

```js
// src/lib/time.js
import { normalizeText } from './normalize.js';

export function normalizeStopName(value) {
  return normalizeText(value);
}

export function toMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function durationBetween(start, end) {
  return toMinutes(end) - toMinutes(start);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/normalize.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json index.html src/lib/normalize.js src/lib/time.js tests/lib/normalize.test.js
git commit -m "chore: scaffold static app and utility modules"
```

### Task 2: Build And Test The Timetable Page Parser

**Files:**
- Create: `tests/fixtures/line12-andora-imperia-sanremo.txt`
- Create: `tests/scripts/parseTimetablePage.test.js`
- Create: `scripts/lib/parseTimetablePage.mjs`
- Create: `data/manual/line-pages.json`

- [ ] **Step 1: Write the failing parser test**

```js
// tests/scripts/parseTimetablePage.test.js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTimetablePage } from '../../scripts/lib/parseTimetablePage.mjs';

const fixture = readFileSync(
  new URL('../fixtures/line12-andora-imperia-sanremo.txt', import.meta.url),
  'utf8',
);

describe('parseTimetablePage', () => {
  it('builds direct trips from a single line page', () => {
    const trips = parseTimetablePage({
      pageNumber: 22,
      lineId: '12',
      direction: 'ANDORA - IMPERIA - SANREMO',
      dayType: 'feriale',
      pageText: fixture,
    });

    expect(trips[0]).toMatchObject({
      lineId: '12',
      dayType: 'feriale',
      sourcePage: 22,
    });

    expect(trips[0].stops[0]).toEqual({ name: 'andora stazione fs', time: '05:35' });
    expect(trips[0].stops.at(-1)).toEqual({ name: 'sanremo autostazione', time: '07:00' });
  });
});
```

```txt
LINEA 12 : ANDORA - IMPERIA - SANREMO FERIALE
LV SAB
Andora Stazione FS 05.35 05.55
Andora Rotonda S.S.1 05.38 05.58
Cervo 05.45 06.05
Imperia Porto Maurizio 06.20 06.40
Sanremo Autostazione 07.00 07.20
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scripts/parseTimetablePage.test.js`
Expected: FAIL with `parseTimetablePage is not a function` or equivalent import error

- [ ] **Step 3: Implement the config-driven timetable parser**

```js
// scripts/lib/parseTimetablePage.mjs
const TIME_RE = /\b\d{2}\.\d{2}\b/g;

function normalizeTime(value) {
  return value.replace('.', ':');
}

function normalizeStopLabel(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTimetablePage({ pageNumber, lineId, direction, dayType, pageText }) {
  const rows = pageText
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .filter((row) => !row.startsWith('LINEA ') && !/^([A-Z-]+\s?)+$/.test(row));

  const parsedRows = rows.map((row) => {
    const times = row.match(TIME_RE) ?? [];
    const stopName = row.replace(TIME_RE, '').replace(/\s+/g, ' ').trim();
    return {
      stopName: normalizeStopLabel(stopName),
      times: times.map(normalizeTime),
    };
  });

  const tripCount = parsedRows[0]?.times.length ?? 0;

  return Array.from({ length: tripCount }, (_, tripIndex) => ({
    lineId,
    direction,
    dayType,
    sourcePage: pageNumber,
    stops: parsedRows
      .map((row) => ({
        name: row.stopName,
        time: row.times[tripIndex],
      }))
      .filter((stop) => stop.time),
  }));
}
```

```json
[
  {
    "lineId": "12",
    "pageNumber": 22,
    "direction": "ANDORA - IMPERIA - SANREMO",
    "dayType": "feriale"
  }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scripts/parseTimetablePage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/line12-andora-imperia-sanremo.txt tests/scripts/parseTimetablePage.test.js scripts/lib/parseTimetablePage.mjs data/manual/line-pages.json
git commit -m "feat: parse timetable pages into trip records"
```

### Task 3: Build The Static Data Pipeline For The Official PDF

**Files:**
- Create: `scripts/fetch-pdf.mjs`
- Create: `scripts/extract-pages.mjs`
- Create: `scripts/build-route-data.mjs`
- Create: `data/manual/stop-aliases.json`
- Create: `assets/data/.gitkeep`

- [ ] **Step 1: Write the failing route-data build test**

```js
// tests/lib/query.test.js
import { describe, expect, it } from 'vitest';
import { buildRouteSummary, findDirectTrips } from '../../src/lib/query.js';

const aliases = {
  'imperia porto maurizio': ['porto maurizio'],
  'sanremo autostazione': ['sanremo'],
};

const trips = [
  {
    lineId: '12',
    dayType: 'feriale',
    sourcePage: 22,
    stops: [
      { name: 'andora stazione fs', time: '05:35' },
      { name: 'imperia porto maurizio', time: '06:20' },
      { name: 'sanremo autostazione', time: '07:00' },
    ],
  },
  {
    lineId: '12',
    dayType: 'feriale',
    sourcePage: 22,
    stops: [
      { name: 'andora stazione fs', time: '05:55' },
      { name: 'imperia porto maurizio', time: '06:40' },
      { name: 'sanremo autostazione', time: '07:20' },
    ],
  },
];

describe('findDirectTrips', () => {
  it('finds direct trips and computes summary metrics', () => {
    const matches = findDirectTrips({
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'feriale',
      aliases,
      trips,
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      departureTime: '06:20',
      arrivalTime: '07:00',
      durationMinutes: 40,
    });

    expect(buildRouteSummary(matches)).toMatchObject({
      averageDurationMinutes: 40,
      firstDeparture: '06:20',
      lastDeparture: '06:40',
      lines: ['12'],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/query.test.js`
Expected: FAIL with module-not-found error for `src/lib/query.js`

- [ ] **Step 3: Implement the query module and the static build scripts**

```js
// src/lib/query.js
import { canonicalizeStopName } from './normalize.js';
import { durationBetween, toMinutes } from './time.js';

export function findDirectTrips({ from, to, dayType, aliases, trips }) {
  const fromName = canonicalizeStopName(from, aliases);
  const toName = canonicalizeStopName(to, aliases);

  return trips
    .filter((trip) => trip.dayType === dayType)
    .map((trip) => {
      const fromStop = trip.stops.find((stop) => stop.name === fromName);
      const toStop = trip.stops.find((stop) => stop.name === toName);

      if (!fromStop || !toStop) return null;
      if (trip.stops.indexOf(fromStop) >= trip.stops.indexOf(toStop)) return null;

      return {
        lineId: trip.lineId,
        sourcePage: trip.sourcePage,
        departureTime: fromStop.time,
        arrivalTime: toStop.time,
        durationMinutes: durationBetween(fromStop.time, toStop.time),
      };
    })
    .filter(Boolean)
    .sort((left, right) => toMinutes(left.departureTime) - toMinutes(right.departureTime));
}

export function buildRouteSummary(matches) {
  const total = matches.reduce((sum, match) => sum + match.durationMinutes, 0);
  return {
    averageDurationMinutes: Math.round(total / matches.length),
    firstDeparture: matches[0]?.departureTime ?? null,
    lastDeparture: matches.at(-1)?.departureTime ?? null,
    lines: [...new Set(matches.map((match) => match.lineId))],
  };
}
```

```js
// scripts/fetch-pdf.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const PDF_URL = 'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf';
const pdfPath = new URL('../build/source/riviera.pdf', import.meta.url);

await mkdir(new URL('../build/source/', import.meta.url), { recursive: true });
const response = await fetch(PDF_URL);
const bytes = Buffer.from(await response.arrayBuffer());
await writeFile(pdfPath, bytes);
console.log('Fetched Riviera Trasporti PDF');
```

```js
// scripts/extract-pages.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfBytes = await readFile(new URL('../build/source/riviera.pdf', import.meta.url));
const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
const pages = [];

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str).join(' ');
  pages.push({ pageNumber, text });
}

await mkdir(new URL('../build/raw/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../build/raw/pages.json', import.meta.url),
  JSON.stringify(pages, null, 2),
);
console.log(`Extracted ${pages.length} pages`);
```

```js
// scripts/build-route-data.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseTimetablePage } from './lib/parseTimetablePage.mjs';

const linePages = JSON.parse(await readFile(new URL('../data/manual/line-pages.json', import.meta.url), 'utf8'));
const aliases = JSON.parse(await readFile(new URL('../data/manual/stop-aliases.json', import.meta.url), 'utf8'));
const pages = JSON.parse(await readFile(new URL('../build/raw/pages.json', import.meta.url), 'utf8'));

const trips = linePages.flatMap((config) => {
  const page = pages.find((entry) => entry.pageNumber === config.pageNumber);
  if (!page) return [];
  return parseTimetablePage({ ...config, pageText: page.text });
});

const stops = Object.entries(aliases).map(([canonical, variants]) => ({ canonical, variants }));
const lines = [...new Set(trips.map((trip) => trip.lineId))].map((lineId) => ({ lineId }));

await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/data/trips.json', import.meta.url), JSON.stringify(trips, null, 2));
await writeFile(new URL('../assets/data/stops.json', import.meta.url), JSON.stringify(stops, null, 2));
await writeFile(new URL('../assets/data/lines.json', import.meta.url), JSON.stringify(lines, null, 2));
console.log(`Built ${trips.length} trips`);
```

```json
{
  "imperia porto maurizio": ["porto maurizio", "imperia p. maurizio"],
  "sanremo autostazione": ["sanremo", "autostazione sanremo"]
}
```

- [ ] **Step 4: Run the unit test and the data build**

Run: `npm test -- tests/lib/query.test.js && npm run build:data`
Expected: PASS for the query test, then console output including `Fetched Riviera Trasporti PDF`, `Extracted 57 pages`, and `Built` with a trip count greater than zero

- [ ] **Step 5: Commit**

```bash
git add src/lib/query.js scripts/fetch-pdf.mjs scripts/extract-pages.mjs scripts/build-route-data.mjs data/manual/stop-aliases.json assets/data/.gitkeep tests/lib/query.test.js
git commit -m "feat: build static route data from the official pdf"
```

### Task 4: Render The Search Experience And Apple-Style Results

**Files:**
- Create: `styles.css`
- Create: `src/main.js`
- Create: `src/ui/renderSearchForm.js`
- Create: `src/ui/renderResults.js`
- Create: `src/ui/renderEmptyState.js`
- Create: `tests/ui/renderResults.test.js`

- [ ] **Step 1: Write the failing render test**

```js
// tests/ui/renderResults.test.js
import { describe, expect, it } from 'vitest';
import { renderResultsView } from '../../src/ui/renderResults.js';

describe('renderResultsView', () => {
  it('renders the route summary, next departures, and full timetable', () => {
    const html = renderResultsView({
      routeLabel: 'Porto Maurizio -> Sanremo',
      summary: {
        averageDurationMinutes: 39,
        firstDeparture: '06:20',
        lastDeparture: '19:45',
        lines: ['12'],
      },
      nextDepartures: [
        { departureTime: '16:45', arrivalTime: '17:25', durationMinutes: 40, lineId: '12', sourcePage: 22 },
      ],
      allDepartures: [
        { departureTime: '06:20', arrivalTime: '07:00', durationMinutes: 40, lineId: '12', sourcePage: 22 },
      ],
    });

    expect(html).toContain('Next departures');
    expect(html).toContain('39 min');
    expect(html).toContain('Open PDF');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/renderResults.test.js`
Expected: FAIL with module-not-found error for `src/ui/renderResults.js`

- [ ] **Step 3: Implement the UI rendering modules and styling**

```js
// src/ui/renderSearchForm.js
export function renderSearchForm({ from = '', to = '', dayType = 'feriale' } = {}) {
  return `
    <section class="hero">
      <p class="eyebrow">Direct route lookup</p>
      <h1>Find buses from Porto Maurizio to Sanremo.</h1>
      <form id="route-form" class="search-form">
        <label><span>From</span><input name="from" value="${from}" placeholder="Porto Maurizio" /></label>
        <label><span>To</span><input name="to" value="${to}" placeholder="Sanremo" /></label>
        <label>
          <span>Day type</span>
          <select name="dayType">
            <option value="feriale" ${dayType === 'feriale' ? 'selected' : ''}>Weekday</option>
            <option value="sabato" ${dayType === 'sabato' ? 'selected' : ''}>Saturday</option>
            <option value="festivo" ${dayType === 'festivo' ? 'selected' : ''}>Holiday</option>
          </select>
        </label>
        <button type="submit">Show departures</button>
      </form>
    </section>
  `;
}
```

```js
// src/ui/renderResults.js
const PDF_URL = 'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf';

function renderDepartureCard(departure) {
  return `
    <article class="departure-card">
      <div>
        <strong>${departure.departureTime}</strong>
        <p>Arrives ${departure.arrivalTime} · Line ${departure.lineId}</p>
      </div>
      <div class="meta">
        <span>${departure.durationMinutes} min</span>
        <a href="${PDF_URL}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">Open PDF</a>
      </div>
    </article>
  `;
}

export function renderResultsView({ routeLabel, summary, nextDepartures, allDepartures }) {
  return `
    <section class="results-shell">
      <div class="summary-card">
        <p class="eyebrow">Route summary</p>
        <h2>${routeLabel}</h2>
        <div class="metrics">
          <div><span>Average</span><strong>${summary.averageDurationMinutes} min</strong></div>
          <div><span>First</span><strong>${summary.firstDeparture}</strong></div>
          <div><span>Last</span><strong>${summary.lastDeparture}</strong></div>
        </div>
      </div>
      <section>
        <h3>Next departures</h3>
        ${nextDepartures.map(renderDepartureCard).join('')}
      </section>
      <section>
        <h3>All departures</h3>
        ${allDepartures.map(renderDepartureCard).join('')}
      </section>
    </section>
  `;
}
```

```js
// src/ui/renderEmptyState.js
export function renderEmptyState(message) {
  return `<section class="empty-state"><p>${message}</p></section>`;
}
```

```js
// src/main.js
import { findDirectTrips, buildRouteSummary } from './lib/query.js';
import { renderSearchForm } from './ui/renderSearchForm.js';
import { renderResultsView } from './ui/renderResults.js';
import { renderEmptyState } from './ui/renderEmptyState.js';

const app = document.querySelector('#app');
const [trips, stops] = await Promise.all([
  fetch('./assets/data/trips.json').then((response) => response.json()),
  fetch('./assets/data/stops.json').then((response) => response.json()),
]);

const aliases = Object.fromEntries(stops.map((stop) => [stop.canonical, stop.variants]));

function bindForm() {
  document.querySelector('#route-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const matches = findDirectTrips({
      from: formData.get('from'),
      to: formData.get('to'),
      dayType: formData.get('dayType'),
      aliases,
      trips,
    });

    if (!matches.length) {
      app.innerHTML = `${renderSearchForm(Object.fromEntries(formData))}${renderEmptyState('No direct route found. Try another stop alias or open the official PDF.')}`;
      bindForm();
      return;
    }

    app.innerHTML = `
      ${renderSearchForm(Object.fromEntries(formData))}
      ${renderResultsView({
        routeLabel: `${formData.get('from')} -> ${formData.get('to')}`,
        summary: buildRouteSummary(matches),
        nextDepartures: matches.slice(0, 3),
        allDepartures: matches,
      })}
    `;
    bindForm();
  });
}

app.innerHTML = renderSearchForm();
bindForm();
```

```css
/* styles.css */
:root {
  --bg-top: #eef2f7;
  --bg-bottom: #dfe7f2;
  --panel: rgba(255, 255, 255, 0.66);
  --line: rgba(15, 23, 42, 0.08);
  --text: #0f1722;
  --muted: #607086;
  --blue: #0a84ff;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
  color: var(--text);
  background: linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
}

#app {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.hero,
.summary-card,
.departure-card,
.empty-state {
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: var(--panel);
  backdrop-filter: blur(20px);
  border-radius: 28px;
}

.hero { padding: 28px; margin-bottom: 24px; }
.hero h1 { font-size: clamp(2.25rem, 6vw, 4rem); letter-spacing: -0.06em; line-height: 0.96; }
.search-form { display: grid; gap: 12px; }
.search-form label { display: grid; gap: 6px; }
.search-form input, .search-form select, .search-form button {
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid var(--line);
  padding: 0 16px;
}
.search-form button { background: var(--blue); color: white; border: 0; }
.results-shell { display: grid; gap: 18px; }
.summary-card { padding: 24px; }
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.departure-card { display: flex; justify-content: space-between; gap: 16px; padding: 18px 20px; margin-top: 12px; }
.meta { display: grid; justify-items: end; gap: 8px; }
@media (max-width: 720px) {
  .metrics { grid-template-columns: 1fr; }
  .departure-card { flex-direction: column; }
}
```

- [ ] **Step 4: Run the render test**

Run: `npm test -- tests/ui/renderResults.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add styles.css src/main.js src/ui/renderSearchForm.js src/ui/renderResults.js src/ui/renderEmptyState.js tests/ui/renderResults.test.js
git commit -m "feat: add apple-style direct route search ui"
```

### Task 5: Final Verification, Documentation, And GitHub Pages Deployment

**Files:**
- Modify: `README.md`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add deployment and local run documentation**

```md
## Development

Install dependencies:

    npm install

Build data from the official Riviera Trasporti PDF:

    npm run build:data

Serve the site locally:

    python3 -m http.server 4173

Open `http://localhost:4173`.
```

- [ ] **Step 2: Add the GitHub Pages workflow**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build:data
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run the full verification suite**

Run: `npm test && npm run build:data`
Expected: all tests PASS and the build writes `assets/data/lines.json`, `assets/data/stops.json`, and `assets/data/trips.json`

- [ ] **Step 4: Smoke-test the static site**

Run: `python3 -m http.server 4173`
Expected: local site opens at `http://localhost:4173`, route search renders, and `Porto Maurizio -> Sanremo` returns direct departures

- [ ] **Step 5: Commit**

```bash
git add README.md .github/workflows/deploy.yml assets/data/lines.json assets/data/stops.json assets/data/trips.json
git commit -m "docs: add deployment workflow and runbook"
```

## Self-Review

- Spec coverage: route-first search, direct trips only, day-type filtering, average travel time, bilingual-ready static UI, PDF source link, and GitHub Pages deployment are all covered by Tasks 1-5.
- Placeholder scan: no `TODO`, `TBD`, or "similar to" references remain.
- Type consistency: the plan consistently uses `lineId`, `dayType`, `sourcePage`, `stops`, `departureTime`, `arrivalTime`, and `durationMinutes`.
