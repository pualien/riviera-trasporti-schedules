# Riviera Full-Network Coverage And GPS Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the route-finder from the line-12 PoC into a full PDF-index-backed direct-route app and add a hybrid nearby-stop picker on both search fields.

**Architecture:** Keep the existing static-site architecture, but replace the single-page parser path with an indexed manifest plus parser-family dispatcher. On the frontend, keep route-first search and load runtime location and map behavior only when the user opens the nearby-stop picker, matching provider results back to the internal stop dataset.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, Node.js 22+, `pdfjs-dist`, `vitest`

---

## File Map

- `scripts/lib/parsePdfIndex.mjs`: parse the PDF index page into explicit timetable-page metadata.
- `scripts/lib/parseTimetablePage.mjs`: dispatch to parser families instead of assuming one page layout.
- `scripts/lib/parseFamilies/shared.mjs`: shared row, column, and section helpers used by all parser families.
- `scripts/lib/parseFamilies/parseLinearIntercity.mjs`: parse linear intercity tables with repeated directional blocks.
- `scripts/lib/parseFamilies/parseUrbanBranched.mjs`: parse urban and branched pages with grouped blocks and irregular columns.
- `scripts/lib/parseFamilies/parseCircularLoop.mjs`: parse circular and loop pages where stop order repeats or wraps.
- `scripts/lib/parseFamilies/parseSchoolLimited.mjs`: parse school-only and limited-service pages with sparse columns.
- `scripts/build-route-data.mjs`: enforce manifest/index coverage and emit expanded JSON schemas.
- `data/manual/line-pages.json`: full indexed manifest of published timetable pages plus parser-family assignments.
- `data/manual/stop-aliases.json`: canonical stop aliases and disambiguation support.
- `assets/data/lines.json`: generated line metadata with source-page references.
- `assets/data/stops.json`: generated stop metadata with stable ids and provider-match metadata.
- `assets/data/trips.json`: generated trip data for all indexed pages.
- `src/lib/normalize.js`: canonicalization, alias lookup, and provider-result matching.
- `src/lib/query.js`: direct-trip lookup using stable stop ids when available.
- `src/lib/nearbyStops.js`: runtime provider lookup, matching, ranking, and caching for nearby stops.
- `src/ui/renderSearchForm.js`: search form markup with location actions on `From` and `To`.
- `src/ui/renderLocationPicker.js`: hybrid map/list picker markup and states.
- `src/main.js`: geolocation flow, provider calls, picker state, and route-search integration.
- `styles.css`: picker and field-action styling.
- `tests/fixtures/pdf-index-page.txt`: PDF index fixture used to verify manifest coverage.
- `tests/fixtures/line1-ventimiglia-ponte-san-luigi.txt`: representative `linear-intercity` fixture.
- `tests/fixtures/line14-1-autostazione-borgo-baragallo.txt`: representative `urban-branched` fixture.
- `tests/fixtures/line14-3-circolare.txt`: representative `circular-or-loop` fixture.
- `tests/fixtures/line19-scolastico.txt`: representative `school-or-limited-service` fixture.
- `tests/scripts/parsePdfIndex.test.js`: coverage and index parsing tests.
- `tests/scripts/parseTimetableFamilies.test.js`: parser-family fixture tests.
- `tests/scripts/buildRouteData.test.js`: build-output and coverage enforcement tests.
- `tests/lib/normalize.test.js`: stop identity and provider-result matching tests.
- `tests/lib/query.test.js`: direct-trip lookup using stable stop ids.
- `tests/lib/nearbyStops.test.js`: nearby provider matching, ranking, and cache tests.
- `tests/ui/renderSearchForm.test.js`: search form markup with location actions.
- `tests/ui/renderLocationPicker.test.js`: picker markup and empty/error states.
- `README.md`: updated data-build, coverage, and GPS behavior notes.

### Task 1: Parse The PDF Index And Turn Coverage Into A Contract

**Files:**
- Create: `tests/fixtures/pdf-index-page.txt`
- Create: `tests/scripts/parsePdfIndex.test.js`
- Create: `scripts/lib/parsePdfIndex.mjs`
- Modify: `data/manual/line-pages.json`

- [ ] **Step 1: Write the failing index parser test**

```js
// tests/scripts/parsePdfIndex.test.js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePdfIndex, diffIndexAgainstManifest } from '../../scripts/lib/parsePdfIndex.mjs';

const indexText = readFileSync(
  new URL('../fixtures/pdf-index-page.txt', import.meta.url),
  'utf8',
);

describe('parsePdfIndex', () => {
  it('extracts timetable pages from the published index', () => {
    const entries = parsePdfIndex(indexText);

    expect(entries).toContainEqual({
      lineId: '12',
      direction: 'SANREMO - IMPERIA - ANDORA',
      pageNumber: 22,
      serviceNote: 'feriale',
    });
    expect(entries).toContainEqual({
      lineId: '14 / 3',
      direction: 'AUTOSTAZIONE - FOCE BORGO - CASINO FOCE',
      pageNumber: 27,
      serviceNote: 'circolare',
    });
  });

  it('reports missing index coverage against the manifest', () => {
    const indexEntries = [
      { lineId: '12', pageNumber: 22, direction: 'SANREMO - IMPERIA - ANDORA' },
      { lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' },
    ];
    const manifest = [{ lineId: '12', pageNumber: 22, direction: 'SANREMO - IMPERIA - ANDORA' }];

    expect(diffIndexAgainstManifest(indexEntries, manifest)).toEqual([
      { lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scripts/parsePdfIndex.test.js`
Expected: FAIL with `Cannot find module '../../scripts/lib/parsePdfIndex.mjs'`

- [ ] **Step 3: Write the minimal index parser and seed manifest format**

```js
// scripts/lib/parsePdfIndex.mjs
const INDEX_RE = /LINEA\s+([A-Z0-9 /]+)\s*:\s*([^"]+?)(?:\(([^)]+)\))?\s+" "\s+(\d+)/g;

function normalizeDirection(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeServiceNote(value = '') {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function parsePdfIndex(pageText) {
  return [...pageText.matchAll(INDEX_RE)].map((match) => ({
    lineId: match[1].trim(),
    direction: normalizeDirection(match[2]),
    serviceNote: normalizeServiceNote(match[3]),
    pageNumber: Number(match[4]),
  }));
}

export function diffIndexAgainstManifest(indexEntries, manifestEntries) {
  const covered = new Set(
    manifestEntries.map((entry) => `${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );

  return indexEntries.filter(
    (entry) => !covered.has(`${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );
}
```

```json
// data/manual/line-pages.json
[
  {
    "lineId": "12",
    "pageNumber": 22,
    "direction": "SANREMO - IMPERIA - ANDORA",
    "serviceNote": "feriale",
    "parserFamily": "linear-intercity"
  },
  {
    "lineId": "12",
    "pageNumber": 23,
    "direction": "ANDORA - IMPERIA - SANREMO",
    "serviceNote": "feriale",
    "parserFamily": "linear-intercity"
  }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scripts/parsePdfIndex.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/pdf-index-page.txt tests/scripts/parsePdfIndex.test.js scripts/lib/parsePdfIndex.mjs data/manual/line-pages.json
git commit -m "test: add pdf index coverage contract"
```

### Task 2: Split Timetable Parsing Into Explicit Layout Families

**Files:**
- Create: `tests/fixtures/line1-ventimiglia-ponte-san-luigi.txt`
- Create: `tests/fixtures/line14-1-autostazione-borgo-baragallo.txt`
- Create: `tests/fixtures/line14-3-circolare.txt`
- Create: `tests/fixtures/line19-scolastico.txt`
- Create: `tests/scripts/parseTimetableFamilies.test.js`
- Create: `scripts/lib/parseFamilies/shared.mjs`
- Create: `scripts/lib/parseFamilies/parseLinearIntercity.mjs`
- Create: `scripts/lib/parseFamilies/parseUrbanBranched.mjs`
- Create: `scripts/lib/parseFamilies/parseCircularLoop.mjs`
- Create: `scripts/lib/parseFamilies/parseSchoolLimited.mjs`
- Modify: `scripts/lib/parseTimetablePage.mjs`

- [ ] **Step 1: Write the failing parser-family test**

```js
// tests/scripts/parseTimetableFamilies.test.js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTimetablePage } from '../../scripts/lib/parseTimetablePage.mjs';

function fixture(name) {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

describe('parseTimetablePage families', () => {
  it('parses linear intercity pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'linear-intercity',
      lineId: '1',
      pageNumber: 3,
      direction: 'VENTIMIGLIA - PONTE SAN LUIGI',
      dayType: 'feriale',
      pageText: fixture('line1-ventimiglia-ponte-san-luigi.txt'),
    });

    expect(trips[0].stops[0]).toEqual({ name: 'ventimiglia via cavour', time: '06:25' });
    expect(trips[0].stops.at(-1)).toEqual({ name: 'ponte san luigi', time: '06:40' });
  });

  it('parses urban branched pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'urban-branched',
      lineId: '14 / 1',
      pageNumber: 26,
      direction: 'AUTOSTAZIONE - BORGO BARAGALLO',
      dayType: 'feriale',
      pageText: fixture('line14-1-autostazione-borgo-baragallo.txt'),
    });

    expect(trips[0].stops.map((stop) => stop.name)).toContain('autostazione');
    expect(trips[0].stops.map((stop) => stop.name)).toContain('borgo baragallo');
  });

  it('parses circular pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'circular-or-loop',
      lineId: '14 / 3',
      pageNumber: 27,
      direction: 'AUTOSTAZIONE - FOCE BORGO - CASINO FOCE',
      dayType: 'feriale',
      pageText: fixture('line14-3-circolare.txt'),
    });

    expect(trips[0].stops[0].name).toBe('autostazione');
    expect(trips[0].stops.at(-1).name).toBe('autostazione');
  });

  it('parses school-only pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'school-or-limited-service',
      lineId: '19',
      pageNumber: 35,
      direction: 'SANREMO - RIVA LIGURE - TERZORIO',
      dayType: 'scolastico',
      pageText: fixture('line19-scolastico.txt'),
    });

    expect(trips).toHaveLength(1);
    expect(trips[0].dayType).toBe('scolastico');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scripts/parseTimetableFamilies.test.js`
Expected: FAIL because `parseTimetablePage` ignores `parserFamily`

- [ ] **Step 3: Implement the parser-family dispatcher and minimal family parsers**

```js
// scripts/lib/parseFamilies/shared.mjs
const TIME_RE = /\b\d{2}\.\d{2}\b/g;

function normalizeTime(value) {
  return value.replace('.', ':');
}

function normalizeStopName(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function parseSimpleColumns(
  { pageNumber, lineId, direction, dayType, pageText },
  {
    repeatFirstStopStartsNewSection = false,
    preserveTerminalRepeat = false,
    defaultDayType = dayType,
  } = {},
) {
  const rows = pageText
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => ({
      stopName: normalizeStopName(row.replace(TIME_RE, '').trim()),
      times: (row.match(TIME_RE) ?? []).map(normalizeTime),
    }))
    .filter((row) => row.stopName && row.times.length);

  const firstStop = rows[0]?.stopName;
  const sections = [];
  let currentSection = [];

  for (const row of rows) {
    if (repeatFirstStopStartsNewSection && currentSection.length && row.stopName === firstStop) {
      sections.push(currentSection);
      currentSection = [];
    }

    currentSection.push(row);
  }

  if (currentSection.length) {
    sections.push(currentSection);
  }

  return sections.flatMap((section) =>
    section[0].times.map((_, tripIndex) => ({
      lineId,
      direction,
      dayType: defaultDayType,
      sourcePage: pageNumber,
      stops: section
        .map((row) => ({ name: row.stopName, time: row.times[tripIndex] ?? null }))
        .filter((stop) => stop.time)
        .filter((stop, index, stops) => preserveTerminalRepeat || index === 0 || stop.name !== stops[index - 1].name),
    })),
  );
}
```

```js
// scripts/lib/parseTimetablePage.mjs
import { parseCircularLoop } from './parseFamilies/parseCircularLoop.mjs';
import { parseLinearIntercity } from './parseFamilies/parseLinearIntercity.mjs';
import { parseSchoolLimited } from './parseFamilies/parseSchoolLimited.mjs';
import { parseUrbanBranched } from './parseFamilies/parseUrbanBranched.mjs';

const FAMILY_PARSERS = {
  'linear-intercity': parseLinearIntercity,
  'urban-branched': parseUrbanBranched,
  'circular-or-loop': parseCircularLoop,
  'school-or-limited-service': parseSchoolLimited,
};

export function parseTimetablePage(config) {
  const parser = FAMILY_PARSERS[config.parserFamily ?? 'linear-intercity'];

  if (!parser) {
    throw new Error(`Unsupported parser family: ${config.parserFamily}`);
  }

  return parser(config);
}
```

```js
// scripts/lib/parseFamilies/parseLinearIntercity.mjs
import { parseSimpleColumns } from './shared.mjs';

export function parseLinearIntercity(config) {
  return parseSimpleColumns(config, { repeatFirstStopStartsNewSection: true });
}
```

```js
// scripts/lib/parseFamilies/parseUrbanBranched.mjs
import { parseSimpleColumns } from './shared.mjs';

export function parseUrbanBranched(config) {
  return parseSimpleColumns(config, { ignoreLoopClosure: true });
}
```

```js
// scripts/lib/parseFamilies/parseCircularLoop.mjs
import { parseSimpleColumns } from './shared.mjs';

export function parseCircularLoop(config) {
  return parseSimpleColumns(config, { preserveTerminalRepeat: true });
}
```

```js
// scripts/lib/parseFamilies/parseSchoolLimited.mjs
import { parseSimpleColumns } from './shared.mjs';

export function parseSchoolLimited(config) {
  return parseSimpleColumns(config, { defaultDayType: 'scolastico' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scripts/parseTimetableFamilies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/line1-ventimiglia-ponte-san-luigi.txt tests/fixtures/line14-1-autostazione-borgo-baragallo.txt tests/fixtures/line14-3-circolare.txt tests/fixtures/line19-scolastico.txt tests/scripts/parseTimetableFamilies.test.js scripts/lib/parseTimetablePage.mjs scripts/lib/parseFamilies
git commit -m "feat: add timetable parser families"
```

### Task 3: Enforce Build Coverage And Emit Expanded Network Assets

**Files:**
- Create: `tests/scripts/buildRouteData.test.js`
- Modify: `scripts/build-route-data.mjs`
- Modify: `assets/data/lines.json`
- Modify: `assets/data/stops.json`
- Modify: `assets/data/trips.json`

- [ ] **Step 1: Write the failing build-output test**

```js
// tests/scripts/buildRouteData.test.js
import { describe, expect, it } from 'vitest';
import { buildRouteData } from '../../scripts/build-route-data.mjs';

describe('buildRouteData', () => {
  it('fails when the manifest misses an indexed page', async () => {
    await expect(
      buildRouteData({
        indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
        manifestEntries: [],
        pages: [],
        aliases: {},
      }),
    ).rejects.toThrow('Missing indexed timetable pages');
  });

  it('builds line, stop, and trip assets with stable ids', async () => {
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
          text: 'Andora Stazione FS 05.35\nImperia Porto Maurizio 06.20\nSanremo Autostazione 07.00',
          items: [],
        },
      ],
      aliases: {
        'andora stazione fs': ['stazione andora'],
        'imperia porto maurizio': ['porto maurizio'],
        'sanremo autostazione': ['sanremo'],
      },
    });

    expect(output.lines[0]).toMatchObject({ lineId: '12' });
    expect(output.stops[1]).toMatchObject({ id: 'imperia-porto-maurizio' });
    expect(output.trips[0].stops[1]).toMatchObject({ stopId: 'imperia-porto-maurizio' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scripts/buildRouteData.test.js`
Expected: FAIL because `buildRouteData` is not exported

- [ ] **Step 3: Extract a build function and enforce manifest coverage**

```js
// scripts/build-route-data.mjs
import { diffIndexAgainstManifest } from './lib/parsePdfIndex.mjs';
import { parseTimetablePage } from './lib/parseTimetablePage.mjs';
import { createStopRecord, stopIdFromName } from '../src/lib/normalize.js';

export async function buildRouteData({ indexEntries, manifestEntries, pages, aliases }) {
  const missingEntries = diffIndexAgainstManifest(indexEntries, manifestEntries);

  if (missingEntries.length) {
    throw new Error(`Missing indexed timetable pages: ${missingEntries.length}`);
  }

  const trips = manifestEntries.flatMap((config) => {
    const page = pages.find((entry) => entry.pageNumber === config.pageNumber);
    if (!page) {
      throw new Error(`Missing page payload for ${config.lineId} page ${config.pageNumber}`);
    }

    return parseTimetablePage({ ...config, pageText: page.text, pageItems: page.items }).map((trip) => ({
      ...trip,
      stops: trip.stops.map((stop) => ({
        ...stop,
        stopId: stopIdFromName(stop.name),
      })),
    }));
  });

  const stopNames = [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.name)))];
  const stops = stopNames.map((name) => createStopRecord(name, aliases[name] ?? []));
  const lines = [...new Set(manifestEntries.map((entry) => entry.lineId))].map((lineId) => ({
    lineId,
    pages: manifestEntries.filter((entry) => entry.lineId === lineId).map((entry) => entry.pageNumber),
  }));

  return { lines, stops, trips };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scripts/buildRouteData.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/scripts/buildRouteData.test.js scripts/build-route-data.mjs assets/data/lines.json assets/data/stops.json assets/data/trips.json
git commit -m "feat: enforce full-network data build coverage"
```

### Task 4: Add Stable Stop Identity And Route Query Support

**Files:**
- Modify: `src/lib/normalize.js`
- Modify: `src/lib/query.js`
- Modify: `tests/lib/normalize.test.js`
- Modify: `tests/lib/query.test.js`

- [ ] **Step 1: Write the failing stop-identity tests**

```js
// tests/lib/normalize.test.js
import { describe, expect, it } from 'vitest';
import {
  canonicalizeStopName,
  createStopRecord,
  matchProviderStopName,
  stopIdFromName,
} from '../../src/lib/normalize.js';

describe('stop identity', () => {
  const aliases = {
    'imperia porto maurizio': ['porto maurizio', 'imperia p. maurizio'],
  };

  it('builds stable stop ids and records', () => {
    expect(stopIdFromName('Imperia Porto Maurizio')).toBe('imperia-porto-maurizio');
    expect(createStopRecord('imperia porto maurizio', aliases['imperia porto maurizio'])).toMatchObject({
      id: 'imperia-porto-maurizio',
      canonical: 'imperia porto maurizio',
    });
  });

  it('matches provider labels back to canonical stops', () => {
    expect(matchProviderStopName('Porto Maurizio', aliases)).toBe('imperia porto maurizio');
    expect(canonicalizeStopName('Imperia P. Maurizio', aliases)).toBe('imperia porto maurizio');
  });
});
```

```js
// tests/lib/query.test.js
it('finds direct trips when stops are stored by stopId', () => {
  const matches = findDirectTrips({
    from: 'Porto Maurizio',
    to: 'Sanremo',
    dayType: 'feriale',
    aliases,
    trips: [
      {
        lineId: '12',
        dayType: 'feriale',
        sourcePage: 23,
        stops: [
          { stopId: 'andora-stazione-fs', name: 'andora stazione fs', time: '05:35' },
          { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
          { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
        ],
      },
    ],
  });

  expect(matches[0]).toMatchObject({
    fromStopId: 'imperia-porto-maurizio',
    toStopId: 'sanremo-autostazione',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/normalize.test.js tests/lib/query.test.js`
Expected: FAIL because the new helpers and match fields do not exist

- [ ] **Step 3: Add stop ids, provider matching, and query support**

```js
// src/lib/normalize.js
export function stopIdFromName(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

export function createStopRecord(canonical, variants) {
  return {
    id: stopIdFromName(canonical),
    canonical,
    variants,
    matchTokens: [canonical, ...variants].map(normalizeText),
  };
}

export function matchProviderStopName(rawValue, aliases) {
  return applyStopAliases(rawValue, aliases);
}
```

```js
// src/lib/query.js
export function findDirectTrips({ from, to, dayType, aliases, trips }) {
  const fromName = canonicalizeStopName(from, aliases);
  const toName = canonicalizeStopName(to, aliases);
  const fromStopId = stopIdFromName(fromName);
  const toStopId = stopIdFromName(toName);

  return trips
    .filter((trip) => trip.dayType === dayType)
    .map((trip) => {
      const fromIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === fromStopId);
      const toIndex = trip.stops.findIndex((stop) => (stop.stopId ?? stopIdFromName(stop.name)) === toStopId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
        return null;
      }

      return {
        lineId: trip.lineId,
        sourcePage: trip.sourcePage,
        fromStopId,
        toStopId,
        departureTime: trip.stops[fromIndex].time,
        arrivalTime: trip.stops[toIndex].time,
        durationMinutes: durationBetween(trip.stops[fromIndex].time, trip.stops[toIndex].time),
      };
    })
    .filter(Boolean);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/normalize.test.js tests/lib/query.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalize.js src/lib/query.js tests/lib/normalize.test.js tests/lib/query.test.js
git commit -m "feat: add stable stop identity for full-network search"
```

### Task 5: Add Runtime Nearby-Stop Lookup, Matching, And Caching

**Files:**
- Create: `src/lib/nearbyStops.js`
- Create: `tests/lib/nearbyStops.test.js`

- [ ] **Step 1: Write the failing nearby-stop tests**

```js
// tests/lib/nearbyStops.test.js
import { describe, expect, it, vi } from 'vitest';
import { buildNearbyStopChoices, createNearbyStopCacheKey } from '../../src/lib/nearbyStops.js';

describe('buildNearbyStopChoices', () => {
  const stops = [
    { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
  ];

  it('matches provider results to known stops and limits to five', async () => {
    const provider = vi.fn().mockResolvedValue([
      { label: 'Porto Maurizio', distanceMeters: 180, lat: 43.886, lon: 8.029 },
      { label: 'Sanremo', distanceMeters: 420, lat: 43.817, lon: 7.777 },
      { label: 'Unknown Stop', distanceMeters: 90, lat: 43.9, lon: 8.1 },
    ]);

    const choices = await buildNearbyStopChoices({
      latitude: 43.886,
      longitude: 8.029,
      stops,
      aliases: {
        'imperia porto maurizio': ['porto maurizio'],
        'sanremo autostazione': ['sanremo'],
      },
      fetchNearbyStops: provider,
      limit: 5,
    });

    expect(choices).toEqual([
      expect.objectContaining({ stopId: 'imperia-porto-maurizio', distanceMeters: 180 }),
      expect.objectContaining({ stopId: 'sanremo-autostazione', distanceMeters: 420 }),
    ]);
  });

  it('builds stable cache keys for rounded coordinates', () => {
    expect(createNearbyStopCacheKey(43.88644, 8.02891)).toBe('43.886|8.029');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/nearbyStops.test.js`
Expected: FAIL with `Cannot find module '../../src/lib/nearbyStops.js'`

- [ ] **Step 3: Implement provider lookup, matching, and cache helpers**

```js
// src/lib/nearbyStops.js
import { matchProviderStopName } from './normalize.js';

export function createNearbyStopCacheKey(latitude, longitude) {
  return `${latitude.toFixed(3)}|${longitude.toFixed(3)}`;
}

export async function buildNearbyStopChoices({
  latitude,
  longitude,
  stops,
  aliases,
  fetchNearbyStops,
  limit = 5,
}) {
  const providerResults = await fetchNearbyStops({ latitude, longitude });
  const stopMap = new Map(stops.map((stop) => [stop.canonical, stop]));

  return providerResults
    .map((result) => {
      const canonical = matchProviderStopName(result.label, aliases);
      const stop = stopMap.get(canonical);

      if (!stop) {
        return null;
      }

      return {
        stopId: stop.id,
        canonical: stop.canonical,
        label: result.label,
        distanceMeters: result.distanceMeters,
        latitude: result.lat,
        longitude: result.lon,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/nearbyStops.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/nearbyStops.js tests/lib/nearbyStops.test.js
git commit -m "feat: add nearby stop provider matching"
```

### Task 6: Integrate The Hybrid Picker Into The Search UI

**Files:**
- Create: `src/ui/renderLocationPicker.js`
- Create: `tests/ui/renderSearchForm.test.js`
- Create: `tests/ui/renderLocationPicker.test.js`
- Modify: `src/ui/renderSearchForm.js`
- Modify: `src/main.js`
- Modify: `styles.css`

- [ ] **Step 1: Write the failing UI tests**

```js
// tests/ui/renderSearchForm.test.js
import { describe, expect, it } from 'vitest';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders location actions on both route fields', () => {
    const html = renderSearchForm();

    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
    expect(html).toContain('Use my location');
  });
});
```

```js
// tests/ui/renderLocationPicker.test.js
import { describe, expect, it } from 'vitest';
import { renderLocationPicker } from '../../src/ui/renderLocationPicker.js';

describe('renderLocationPicker', () => {
  it('renders a compact map region and nearby choices', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      nearbyStops: [
        { stopId: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', distanceMeters: 180 },
      ],
    });

    expect(html).toContain('Nearest stops');
    expect(html).toContain('imperia porto maurizio');
    expect(html).toContain('data-stop-id="imperia-porto-maurizio"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/renderSearchForm.test.js tests/ui/renderLocationPicker.test.js`
Expected: FAIL because the location actions and picker renderer do not exist

- [ ] **Step 3: Render field actions, picker states, and wire them in `main.js`**

```js
// src/ui/renderSearchForm.js
function renderLocationButton(fieldName) {
  return `
    <button type="button" class="field-location-button" data-location-field="${fieldName}">
      Use my location
    </button>
  `;
}
```

```js
// src/ui/renderLocationPicker.js
export function renderLocationPicker({ fieldName, state, nearbyStops = [], message = '' }) {
  if (state === 'error') {
    return `<section class="location-picker"><p>${message}</p></section>`;
  }

  return `
    <section class="location-picker" data-field-name="${fieldName}">
      <div class="location-map-shell">
        <div id="nearby-map" class="location-map">Map loading…</div>
      </div>
      <div class="location-choices">
        <h3>Nearest stops</h3>
        ${nearbyStops
          .map(
            (stop) => `
              <button type="button" class="nearby-stop" data-stop-id="${stop.stopId}">
                <strong>${stop.canonical}</strong>
                <span>${stop.distanceMeters} m</span>
              </button>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}
```

```js
// src/main.js
async function handleLocationRequest(fieldName) {
  renderShell(`${renderSearchForm(formState)}${renderLocationPicker({ fieldName, state: 'loading' })}`);

  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    const nearbyStops = await buildNearbyStopChoices({
      latitude: coords.latitude,
      longitude: coords.longitude,
      stops,
      aliases,
      fetchNearbyStops,
    });

    renderShell(
      `${renderSearchForm(formState)}${renderLocationPicker({ fieldName, state: 'ready', nearbyStops })}`,
    );
    bindLocationChoice(fieldName, nearbyStops);
  }, () => {
    renderShell(
      `${renderSearchForm(formState)}${renderLocationPicker({
        fieldName,
        state: 'error',
        message: 'Location access was denied. Type the stop name manually instead.',
      })}`,
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/renderSearchForm.test.js tests/ui/renderLocationPicker.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/renderSearchForm.js src/ui/renderLocationPicker.js src/main.js styles.css tests/ui/renderSearchForm.test.js tests/ui/renderLocationPicker.test.js
git commit -m "feat: add hybrid nearby-stop picker ui"
```

### Task 7: Update Readme And Run Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing documentation assertion as a checklist**

```text
- README must explain that `npm run build:data` now expects full PDF-index coverage.
- README must explain that route search is still direct-trip only.
- README must explain that nearby-stop lookup depends on browser geolocation and a runtime provider.
```

- [ ] **Step 2: Update the README minimally**

````md
## Development

Build static route data from the official Riviera Trasporti PDF:

```bash
npm run build:data
```

The build now checks the published PDF index against `data/manual/line-pages.json` and fails if indexed timetable pages are missing.

## Nearby Stop Picker

The `From` and `To` fields support a nearby-stop flow that uses browser geolocation and a runtime provider to suggest the 3-5 closest known stops. If geolocation is blocked or provider results cannot be matched confidently, users can still search by typing stop names manually.

## Scope

The app supports direct rides from the official PDF. It does not yet plan transfers.
````

- [ ] **Step 3: Run the focused and full test suite**

Run: `npm test -- tests/scripts/parsePdfIndex.test.js tests/scripts/parseTimetableFamilies.test.js tests/scripts/buildRouteData.test.js tests/lib/normalize.test.js tests/lib/query.test.js tests/lib/nearbyStops.test.js tests/ui/renderResults.test.js tests/ui/renderSearchForm.test.js tests/ui/renderLocationPicker.test.js`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Rebuild the data assets**

Run: `npm run build:data`
Expected: PASS with a summary line that includes the number of indexed pages covered and trips built

- [ ] **Step 5: Commit**

```bash
git add README.md data/manual/line-pages.json assets/data/lines.json assets/data/stops.json assets/data/trips.json
git commit -m "docs: update full-network build and gps usage notes"
```
