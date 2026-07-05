# GTFS Primary Data Freshness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Regione Liguria GTFS the primary schedule source while preserving the app's existing runtime data contract and adding build-time freshness guardrails plus rider-facing source status.

**Architecture:** Add focused GTFS parsing, normalization, and quality-report modules under `scripts/lib/gtfs/`, then wire them through a new build script that writes the same `assets/data/*.json` shapes currently produced by the PDF pipeline. Keep the PDF parser available as a reference path, add source-status formatting in `src/lib/dataFreshness.js`, and render the resulting status in the app shell, results, and generated SEO pages.

**Tech Stack:** Node.js ES modules, built-in `node:test`-style filesystem APIs through Vitest tests, existing vanilla JavaScript UI renderers, static JSON assets, GitHub Pages-compatible build scripts.

---

## File Structure

- Create `scripts/lib/gtfs/parseGtfsCsv.mjs`: tiny CSV parser for GTFS text files, including quoted fields and CRLF input.
- Create `scripts/lib/gtfs/loadGtfsFeed.mjs`: reads a GTFS directory from disk and returns parsed GTFS tables.
- Create `scripts/lib/gtfs/normalizeGtfsData.mjs`: converts parsed GTFS tables into the existing runtime contract: lines, stops, trips, localities, reachability, metadata, and coordinates.
- Create `scripts/lib/gtfs/validateGtfsRuntimeData.mjs`: produces hard errors, warnings, summary counts, and freshness status.
- Create `scripts/build-gtfs-route-data.mjs`: build entry point that reads GTFS, manual locality/alias files, and writes `assets/data/*.json`.
- Modify `scripts/build-route-data.mjs`: export existing stop/locality/reachability helpers for reuse, without changing current PDF behavior.
- Modify `package.json`: add `build:data:pdf`, `build:data:gtfs`, and make `build:data` call the GTFS route-data builder plus existing stop-coordinate/SEO-compatible steps once ready.
- Modify `src/lib/appBootstrap.js`: load `assets/data/data-quality.json` as an optional sidecar.
- Create `src/lib/dataFreshness.js`: normalize metadata/quality into display text and status flags for UI and tests.
- Modify `src/ui/renderShell.js`: replace the current PDF freshness marker with the new source chip/details/banner surface.
- Modify `src/ui/renderResults.js`: render source-copy text and feed-only labels for departures without PDF verification.
- Modify `src/lib/i18n.js`: add freshness/source strings in the existing supported languages.
- Modify `scripts/lib/renderSeoPageHtml.mjs`: render GTFS source validity on generated SEO pages.
- Add tests under `tests/scripts/gtfs*.test.js`, `tests/lib/dataFreshness.test.js`, and update existing UI/SEO tests.
- Add fixtures under `tests/fixtures/gtfs/minimal/` and `tests/fixtures/gtfs/expired/`.

## Task 1: Extract Shared Runtime-Data Helpers

**Files:**
- Modify: `scripts/build-route-data.mjs`
- Test: `tests/scripts/buildRouteData.test.js`

- [ ] **Step 1: Export existing helper functions**

In `scripts/build-route-data.mjs`, export these existing functions without changing their bodies:

```js
export function stopIdFromName(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

export function createStopRecord(canonical, variants) {
  return {
    id: stopIdFromName(canonical),
    canonical,
    variants,
  };
}

export function validateLocalities(localities, stops) {
  const stopIds = new Set(stops.map((stop) => stop.id));

  for (const locality of localities) {
    for (const stopId of locality.stopIds) {
      if (!stopIds.has(stopId)) {
        throw new Error(`Unknown locality stop id: ${stopId}`);
      }
    }
  }

  return localities.map((locality) => ({
    ...locality,
    matchTokens: [...new Set([
      locality.label,
      ...(locality.aliases ?? []),
      ...(locality.matchTokens ?? []),
    ].map(normalizeText))],
  }));
}

export function deriveLocalitiesFromRules(localityRules = [], stops = []) {
  return localityRules
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      aliases: rule.aliases ?? [],
      stopIds: stops
        .filter((stop) => stopMatchesLocalityRule(stop, rule))
        .map((stop) => stop.id),
      matchTokens: rule.matchTokens ?? [],
    }))
    .filter((locality) => locality.stopIds.length > 0);
}

export function mergeLocalities(manualLocalities = [], generatedLocalities = []) {
  const byId = new Map();

  for (const locality of [...generatedLocalities, ...manualLocalities]) {
    const current = byId.get(locality.id) ?? {
      ...locality,
      aliases: [],
      stopIds: [],
      matchTokens: [],
    };

    byId.set(locality.id, {
      ...current,
      ...locality,
      aliases: [...new Set([...(current.aliases ?? []), ...(locality.aliases ?? [])])],
      stopIds: [...new Set([...(current.stopIds ?? []), ...(locality.stopIds ?? [])])],
      matchTokens: [...new Set([...(current.matchTokens ?? []), ...(locality.matchTokens ?? [])])],
    });
  }

  return [...byId.values()].sort((left, right) =>
    normalizeText(left.label).localeCompare(normalizeText(right.label)),
  );
}

export function buildReachability(trips) {
  const reachability = {};

  for (const trip of trips) {
    for (let fromIndex = 0; fromIndex < trip.stops.length; fromIndex += 1) {
      const fromStopId = trip.stops[fromIndex].stopId;
      const reachable = reachability[fromStopId] ?? new Set();

      for (let toIndex = fromIndex + 1; toIndex < trip.stops.length; toIndex += 1) {
        reachable.add(trip.stops[toIndex].stopId);
      }

      reachability[fromStopId] = reachable;
    }
  }

  return Object.fromEntries(
    Object.entries(reachability).map(([stopId, destinations]) => [stopId, [...destinations].sort()]),
  );
}
```

- [ ] **Step 2: Verify the PDF builder still passes**

Run:

```bash
rtk npm test -- tests/scripts/buildRouteData.test.js
```

Expected: all `buildRouteData` tests pass. This proves the helper export is behavior-preserving.

- [ ] **Step 3: Commit**

```bash
rtk git add scripts/build-route-data.mjs tests/scripts/buildRouteData.test.js
rtk git commit -m "refactor: export route data build helpers"
```

## Task 2: Add GTFS CSV Parsing

**Files:**
- Create: `scripts/lib/gtfs/parseGtfsCsv.mjs`
- Test: `tests/scripts/gtfsCsv.test.js`

- [ ] **Step 1: Write failing CSV parser tests**

Create `tests/scripts/gtfsCsv.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { parseGtfsCsv } from '../../scripts/lib/gtfs/parseGtfsCsv.mjs';

describe('parseGtfsCsv', () => {
  it('parses GTFS CSV rows with headers', () => {
    expect(parseGtfsCsv('stop_id,stop_name\nS1,Sanremo Autostazione\nS2,Imperia\n')).toEqual([
      { stop_id: 'S1', stop_name: 'Sanremo Autostazione' },
      { stop_id: 'S2', stop_name: 'Imperia' },
    ]);
  });

  it('handles quoted commas, escaped quotes, and CRLF endings', () => {
    expect(parseGtfsCsv('stop_id,stop_name\r\nS1,"Sanremo, ""Autostazione"""\r\n')).toEqual([
      { stop_id: 'S1', stop_name: 'Sanremo, "Autostazione"' },
    ]);
  });

  it('ignores a UTF-8 BOM and trailing blank lines', () => {
    expect(parseGtfsCsv('\uFEFFroute_id,route_short_name\n12,12\n\n')).toEqual([
      { route_id: '12', route_short_name: '12' },
    ]);
  });

  it('throws when a data row has a different number of fields than the header', () => {
    expect(() => parseGtfsCsv('a,b\n1,2,3\n')).toThrow('CSV row 2 has 3 fields; expected 2');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk npm test -- tests/scripts/gtfsCsv.test.js
```

Expected: FAIL because `scripts/lib/gtfs/parseGtfsCsv.mjs` does not exist.

- [ ] **Step 3: Implement the CSV parser**

Create `scripts/lib/gtfs/parseGtfsCsv.mjs`:

```js
function stripBom(value) {
  return String(value ?? '').replace(/^\uFEFF/, '');
}

function parseRows(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        quoted = false;
        continue;
      }

      field += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (quoted) {
    throw new Error('CSV input ended inside a quoted field');
  }

  return rows.filter((entry) => entry.some((fieldValue) => fieldValue !== ''));
}

export function parseGtfsCsv(input) {
  const rows = parseRows(stripBom(input));
  const [headers, ...records] = rows;

  if (!headers?.length) {
    return [];
  }

  return records.map((record, index) => {
    if (record.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${record.length} fields; expected ${headers.length}`);
    }

    return Object.fromEntries(headers.map((header, headerIndex) => [header, record[headerIndex]]));
  });
}
```

- [ ] **Step 4: Verify parser tests pass**

Run:

```bash
rtk npm test -- tests/scripts/gtfsCsv.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add scripts/lib/gtfs/parseGtfsCsv.mjs tests/scripts/gtfsCsv.test.js
rtk git commit -m "feat: parse GTFS CSV files"
```

## Task 3: Load GTFS Feed Directories

**Files:**
- Create: `scripts/lib/gtfs/loadGtfsFeed.mjs`
- Create fixture files under: `tests/fixtures/gtfs/minimal/`
- Test: `tests/scripts/loadGtfsFeed.test.js`

- [ ] **Step 1: Add a minimal valid GTFS fixture**

Create these files:

`tests/fixtures/gtfs/minimal/agency.txt`

```csv
agency_id,agency_name,agency_url,agency_timezone
RT,Riviera Trasporti,https://www.rivieratrasporti.it/,Europe/Rome
```

`tests/fixtures/gtfs/minimal/routes.txt`

```csv
route_id,agency_id,route_short_name,route_long_name,route_type
R12,RT,12,Andora - Imperia - Sanremo,3
```

`tests/fixtures/gtfs/minimal/stops.txt`

```csv
stop_id,stop_name,stop_lat,stop_lon
S_ANDORA,Andora Stazione FS,43.952,8.141
S_IMPERIA,Imperia Porto Maurizio,43.886,8.030
S_SANREMO,Sanremo Autostazione,43.817,7.777
```

`tests/fixtures/gtfs/minimal/calendar.txt`

```csv
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WD,1,1,1,1,1,0,0,20260614,20261212
```

`tests/fixtures/gtfs/minimal/calendar_dates.txt`

```csv
service_id,date,exception_type
WD,20260815,2
```

`tests/fixtures/gtfs/minimal/trips.txt`

```csv
route_id,service_id,trip_id,trip_headsign,direction_id
R12,WD,T12_1,Sanremo,0
```

`tests/fixtures/gtfs/minimal/stop_times.txt`

```csv
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T12_1,05:35:00,05:35:00,S_ANDORA,1
T12_1,06:20:00,06:20:00,S_IMPERIA,2
T12_1,07:00:00,07:00:00,S_SANREMO,3
```

- [ ] **Step 2: Write failing feed loader tests**

Create `tests/scripts/loadGtfsFeed.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { loadGtfsFeed } from '../../scripts/lib/gtfs/loadGtfsFeed.mjs';

describe('loadGtfsFeed', () => {
  it('loads required GTFS files from a directory', async () => {
    const feed = await loadGtfsFeed(new URL('../fixtures/gtfs/minimal/', import.meta.url));

    expect(feed.agency[0]).toMatchObject({ agency_id: 'RT', agency_name: 'Riviera Trasporti' });
    expect(feed.routes[0]).toMatchObject({ route_id: 'R12', route_short_name: '12' });
    expect(feed.stops).toHaveLength(3);
    expect(feed.trips[0]).toMatchObject({ trip_id: 'T12_1', service_id: 'WD' });
    expect(feed.stopTimes).toHaveLength(3);
    expect(feed.calendar[0]).toMatchObject({ service_id: 'WD', start_date: '20260614' });
    expect(feed.calendarDates[0]).toMatchObject({ date: '20260815', exception_type: '2' });
  });

  it('throws a clear error when a required GTFS file is missing', async () => {
    await expect(
      loadGtfsFeed(new URL('../fixtures/gtfs/missing/', import.meta.url)),
    ).rejects.toThrow('Missing required GTFS file: agency.txt');
  });
});
```

- [ ] **Step 3: Run the failing loader test**

Run:

```bash
rtk npm test -- tests/scripts/loadGtfsFeed.test.js
```

Expected: FAIL because `loadGtfsFeed.mjs` does not exist.

- [ ] **Step 4: Implement the loader**

Create `scripts/lib/gtfs/loadGtfsFeed.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { parseGtfsCsv } from './parseGtfsCsv.mjs';

const REQUIRED_FILES = Object.freeze({
  agency: 'agency.txt',
  routes: 'routes.txt',
  stops: 'stops.txt',
  trips: 'trips.txt',
  stopTimes: 'stop_times.txt',
});

const OPTIONAL_FILES = Object.freeze({
  calendar: 'calendar.txt',
  calendarDates: 'calendar_dates.txt',
});

async function readGtfsFile(directoryUrl, filename, { required }) {
  try {
    const raw = await readFile(new URL(filename, directoryUrl), 'utf8');
    return parseGtfsCsv(raw);
  } catch (error) {
    if (!required && error?.code === 'ENOENT') {
      return [];
    }

    if (error?.code === 'ENOENT') {
      throw new Error(`Missing required GTFS file: ${filename}`);
    }

    throw error;
  }
}

export async function loadGtfsFeed(directoryUrl) {
  const requiredEntries = await Promise.all(
    Object.entries(REQUIRED_FILES).map(async ([key, filename]) => [
      key,
      await readGtfsFile(directoryUrl, filename, { required: true }),
    ]),
  );
  const optionalEntries = await Promise.all(
    Object.entries(OPTIONAL_FILES).map(async ([key, filename]) => [
      key,
      await readGtfsFile(directoryUrl, filename, { required: false }),
    ]),
  );

  return Object.fromEntries([...requiredEntries, ...optionalEntries]);
}
```

- [ ] **Step 5: Verify loader tests pass**

Run:

```bash
rtk npm test -- tests/scripts/loadGtfsFeed.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add scripts/lib/gtfs/loadGtfsFeed.mjs tests/fixtures/gtfs/minimal tests/scripts/loadGtfsFeed.test.js
rtk git commit -m "feat: load GTFS feed directories"
```

## Task 4: Normalize GTFS Into Runtime Data

**Files:**
- Create: `scripts/lib/gtfs/normalizeGtfsData.mjs`
- Test: `tests/scripts/normalizeGtfsData.test.js`

- [ ] **Step 1: Write failing normalization tests**

Create `tests/scripts/normalizeGtfsData.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { loadGtfsFeed } from '../../scripts/lib/gtfs/loadGtfsFeed.mjs';
import { normalizeGtfsData } from '../../scripts/lib/gtfs/normalizeGtfsData.mjs';

describe('normalizeGtfsData', () => {
  it('converts GTFS tables into the app runtime data contract', async () => {
    const feed = await loadGtfsFeed(new URL('../fixtures/gtfs/minimal/', import.meta.url));
    const output = normalizeGtfsData({
      feed,
      aliases: {
        'andora stazione fs': ['stazione andora'],
        'imperia porto maurizio': ['porto maurizio'],
      },
      localities: [
        {
          id: 'sanremo',
          label: 'Sanremo',
          aliases: [],
          stopIds: ['sanremo-autostazione'],
        },
      ],
      localityRules: [
        {
          id: 'imperia',
          label: 'Imperia',
          aliases: [],
          matchTokens: ['imperia'],
        },
      ],
      sourceUrl: 'https://example.com/gtfs.zip',
      builtAt: '2026-07-06T08:00:00.000Z',
    });

    expect(output.lines).toEqual([{ lineId: '12', pages: [] }]);
    expect(output.stops).toContainEqual({
      id: 'imperia-porto-maurizio',
      canonical: 'Imperia Porto Maurizio',
      variants: ['porto maurizio'],
    });
    expect(output.trips).toHaveLength(1);
    expect(output.trips[0]).toMatchObject({
      lineId: '12',
      direction: 'Sanremo',
      dayType: 'feriale',
      sourcePage: null,
    });
    expect(output.trips[0].stops).toEqual([
      { name: 'Andora Stazione FS', time: '05:35', stopId: 'andora-stazione-fs' },
      { name: 'Imperia Porto Maurizio', time: '06:20', stopId: 'imperia-porto-maurizio' },
      { name: 'Sanremo Autostazione', time: '07:00', stopId: 'sanremo-autostazione' },
    ]);
    expect(output.localities).toContainEqual(
      expect.objectContaining({ id: 'imperia', stopIds: ['imperia-porto-maurizio'] }),
    );
    expect(output.reachability['imperia-porto-maurizio']).toEqual(['sanremo-autostazione']);
    expect(output.stopCoordinates).toMatchObject({
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });
    expect(output.metadata).toMatchObject({
      source: {
        type: 'gtfs',
        title: 'Regione Liguria GTFS planned-service feed',
        url: 'https://example.com/gtfs.zip',
        validFrom: '2026-06-14',
        validUntil: '2026-12-12',
      },
      builtAt: '2026-07-06T08:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Run the failing normalization test**

Run:

```bash
rtk npm test -- tests/scripts/normalizeGtfsData.test.js
```

Expected: FAIL because `normalizeGtfsData.mjs` does not exist.

- [ ] **Step 3: Implement normalization**

Create `scripts/lib/gtfs/normalizeGtfsData.mjs`:

```js
import {
  buildReachability,
  createStopRecord,
  deriveLocalitiesFromRules,
  mergeLocalities,
  stopIdFromName,
  validateLocalities,
} from '../../build-route-data.mjs';

function parseGtfsDate(value) {
  const match = String(value ?? '').match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function normalizeTime(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function dayTypeForService(calendarEntry) {
  if (!calendarEntry) {
    return 'giornaliero';
  }

  const weekdayActive = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    .some((day) => calendarEntry[day] === '1');
  const saturdayActive = calendarEntry.saturday === '1';
  const sundayActive = calendarEntry.sunday === '1';

  if (weekdayActive && !saturdayActive && !sundayActive) {
    return 'feriale';
  }

  if (!weekdayActive && (saturdayActive || sundayActive)) {
    return 'festivo';
  }

  return 'giornaliero';
}

function serviceRange(calendar = []) {
  const starts = calendar.map((entry) => parseGtfsDate(entry.start_date)).filter(Boolean).sort();
  const ends = calendar.map((entry) => parseGtfsDate(entry.end_date)).filter(Boolean).sort();

  return {
    validFrom: starts[0] ?? null,
    validUntil: ends.at(-1) ?? null,
  };
}

function sortedStopTimes(stopTimes) {
  return [...stopTimes].sort((left, right) =>
    Number(left.stop_sequence) - Number(right.stop_sequence),
  );
}

function buildStops(gtfsStops, aliases) {
  return gtfsStops.map((stop) => {
    const canonical = stop.stop_name;
    return createStopRecord(canonical, aliases[canonical.toLowerCase()] ?? aliases[canonical] ?? []);
  });
}

function buildCoordinates(gtfsStops) {
  return Object.fromEntries(
    gtfsStops
      .map((stop) => {
        const latitude = Number(stop.stop_lat);
        const longitude = Number(stop.stop_lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return [stopIdFromName(stop.stop_name), { latitude, longitude }];
      })
      .filter(Boolean),
  );
}

function buildLines(routes) {
  return routes.map((route) => ({
    lineId: route.route_short_name || route.route_id,
    pages: [],
  }));
}

function buildTrips({ routesById, trips, stopTimesByTripId, stopsById, calendarByServiceId }) {
  return trips.flatMap((trip, tripIndex) => {
    const route = routesById.get(trip.route_id);
    const stopTimes = sortedStopTimes(stopTimesByTripId.get(trip.trip_id) ?? []);

    if (!route || !stopTimes.length) {
      return [];
    }

    const stops = stopTimes.map((stopTime) => {
      const stop = stopsById.get(stopTime.stop_id);
      const time = normalizeTime(stopTime.departure_time || stopTime.arrival_time);

      if (!stop || !time) {
        return null;
      }

      return {
        name: stop.stop_name,
        time,
        stopId: stopIdFromName(stop.stop_name),
      };
    });

    if (stops.some((stop) => !stop)) {
      return [];
    }

    return [{
      lineId: route.route_short_name || route.route_id,
      direction: trip.trip_headsign || route.route_long_name || '',
      dayType: dayTypeForService(calendarByServiceId.get(trip.service_id)),
      sourcePage: null,
      tripIndex,
      stops,
    }];
  });
}

export function normalizeGtfsData({
  feed,
  aliases = {},
  localities = [],
  localityRules = [],
  sourceUrl,
  builtAt = new Date().toISOString(),
}) {
  const routesById = new Map(feed.routes.map((route) => [route.route_id, route]));
  const stopsById = new Map(feed.stops.map((stop) => [stop.stop_id, stop]));
  const calendarByServiceId = new Map(feed.calendar.map((entry) => [entry.service_id, entry]));
  const stopTimesByTripId = new Map();

  for (const stopTime of feed.stopTimes) {
    const entries = stopTimesByTripId.get(stopTime.trip_id) ?? [];
    entries.push(stopTime);
    stopTimesByTripId.set(stopTime.trip_id, entries);
  }

  const stops = buildStops(feed.stops, aliases);
  const trips = buildTrips({
    routesById,
    trips: feed.trips,
    stopTimesByTripId,
    stopsById,
    calendarByServiceId,
  });
  const generatedLocalities = deriveLocalitiesFromRules(localityRules, stops);
  const validatedLocalities = validateLocalities(mergeLocalities(localities, generatedLocalities), stops);
  const { validFrom, validUntil } = serviceRange(feed.calendar);

  return {
    lines: buildLines(feed.routes),
    stops,
    trips,
    localities: validatedLocalities,
    reachability: buildReachability(trips),
    stopCoordinates: buildCoordinates(feed.stops),
    metadata: {
      source: {
        type: 'gtfs',
        title: 'Regione Liguria GTFS planned-service feed',
        url: sourceUrl,
        publisher: feed.agency[0]?.agency_name ?? 'Regione Liguria',
        releasedAt: null,
        validFrom,
        validUntil,
        referencePdf: null,
      },
      builtAt,
      coverage: {
        routeCount: feed.routes.length,
        stopCount: feed.stops.length,
        tripCount: trips.length,
        stopTimeCount: feed.stopTimes.length,
      },
    },
  };
}
```

- [ ] **Step 4: Verify normalization tests pass**

Run:

```bash
rtk npm test -- tests/scripts/normalizeGtfsData.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add scripts/lib/gtfs/normalizeGtfsData.mjs tests/scripts/normalizeGtfsData.test.js
rtk git commit -m "feat: normalize GTFS route data"
```

## Task 5: Validate Data Quality And Freshness

**Files:**
- Create: `scripts/lib/gtfs/validateGtfsRuntimeData.mjs`
- Create fixture directory: `tests/fixtures/gtfs/expired/`
- Test: `tests/scripts/validateGtfsRuntimeData.test.js`

- [ ] **Step 1: Create expired fixture by copying minimal GTFS calendar**

Create `tests/fixtures/gtfs/expired/` with the same files as `tests/fixtures/gtfs/minimal/`, except `calendar.txt`:

```csv
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WD,1,1,1,1,1,0,0,20240101,20240131
```

- [ ] **Step 2: Write failing quality validation tests**

Create `tests/scripts/validateGtfsRuntimeData.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { validateGtfsRuntimeData } from '../../scripts/lib/gtfs/validateGtfsRuntimeData.mjs';

const baseRuntimeData = {
  lines: [{ lineId: '12', pages: [] }],
  stops: [{ id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione', variants: [] }],
  trips: [
    {
      lineId: '12',
      dayType: 'feriale',
      sourcePage: null,
      stops: [
        { stopId: 'imperia-porto-maurizio', name: 'Imperia Porto Maurizio', time: '06:20' },
        { stopId: 'sanremo-autostazione', name: 'Sanremo Autostazione', time: '07:00' },
      ],
    },
  ],
  localities: [{ id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo-autostazione'] }],
  reachability: { 'imperia-porto-maurizio': ['sanremo-autostazione'] },
  metadata: {
    source: {
      type: 'gtfs',
      validFrom: '2026-06-14',
      validUntil: '2026-12-12',
    },
    builtAt: '2026-07-06T08:00:00.000Z',
  },
};

describe('validateGtfsRuntimeData', () => {
  it('marks usable future-valid data as fresh', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: baseRuntimeData,
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('fresh');
    expect(report.errors).toEqual([]);
    expect(report.counts).toMatchObject({
      lines: 1,
      stops: 1,
      trips: 1,
      directPairs: 1,
    });
  });

  it('fails expired feed data', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        metadata: {
          ...baseRuntimeData.metadata,
          source: {
            ...baseRuntimeData.metadata.source,
            validUntil: '2026-01-31',
          },
        },
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('failed');
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'SOURCE_EXPIRED' }));
  });

  it('warns when feed validity ends soon', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        metadata: {
          ...baseRuntimeData.metadata,
          source: {
            ...baseRuntimeData.metadata.source,
            validUntil: '2026-07-20',
          },
        },
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('warning');
    expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'SOURCE_ENDS_SOON' }));
  });

  it('fails empty runtime data', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        lines: [],
        stops: [],
        trips: [],
        reachability: {},
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('failed');
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'NO_LINES',
      'NO_STOPS',
      'NO_TRIPS',
      'NO_DIRECT_PAIRS',
    ]));
  });
});
```

- [ ] **Step 3: Run the failing validation test**

Run:

```bash
rtk npm test -- tests/scripts/validateGtfsRuntimeData.test.js
```

Expected: FAIL because `validateGtfsRuntimeData.mjs` does not exist.

- [ ] **Step 4: Implement validation**

Create `scripts/lib/gtfs/validateGtfsRuntimeData.mjs`:

```js
const SOURCE_ENDS_SOON_DAYS = 21;

function daysUntil(dateString, now) {
  const target = new Date(`${dateString}T23:59:59.999Z`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function directPairCount(reachability = {}) {
  return Object.values(reachability).reduce((sum, destinations) => sum + destinations.length, 0);
}

function issue(code, message) {
  return { code, message };
}

export function validateGtfsRuntimeData({ runtimeData, now = new Date() }) {
  const counts = {
    lines: runtimeData.lines?.length ?? 0,
    stops: runtimeData.stops?.length ?? 0,
    trips: runtimeData.trips?.length ?? 0,
    localities: runtimeData.localities?.length ?? 0,
    directPairs: directPairCount(runtimeData.reachability),
  };
  const errors = [];
  const warnings = [];
  const source = runtimeData.metadata?.source ?? {};
  const validUntilDays = source.validUntil ? daysUntil(source.validUntil, now) : null;

  if (!counts.lines) errors.push(issue('NO_LINES', 'Generated GTFS data has no lines.'));
  if (!counts.stops) errors.push(issue('NO_STOPS', 'Generated GTFS data has no stops.'));
  if (!counts.trips) errors.push(issue('NO_TRIPS', 'Generated GTFS data has no trips.'));
  if (!counts.directPairs) errors.push(issue('NO_DIRECT_PAIRS', 'Generated GTFS data has no direct stop pairs.'));
  if (!source.validFrom || !source.validUntil) {
    errors.push(issue('SOURCE_VALIDITY_MISSING', 'GTFS source validity range is missing.'));
  }
  if (validUntilDays !== null && validUntilDays < 0) {
    errors.push(issue('SOURCE_EXPIRED', 'GTFS source validity range has already ended.'));
  }
  if (validUntilDays !== null && validUntilDays >= 0 && validUntilDays <= SOURCE_ENDS_SOON_DAYS) {
    warnings.push(issue('SOURCE_ENDS_SOON', 'GTFS source validity range ends soon.'));
  }
  if (counts.localities < 20) {
    warnings.push(issue('LOW_LOCALITY_COVERAGE', 'Fewer than 20 localities are assigned.'));
  }

  return {
    status: errors.length ? 'failed' : warnings.length ? 'warning' : 'fresh',
    generatedAt: now.toISOString(),
    source: {
      type: source.type ?? 'unknown',
      validFrom: source.validFrom ?? null,
      validUntil: source.validUntil ?? null,
    },
    counts,
    errors,
    warnings,
  };
}
```

- [ ] **Step 5: Verify validation tests pass**

Run:

```bash
rtk npm test -- tests/scripts/validateGtfsRuntimeData.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add scripts/lib/gtfs/validateGtfsRuntimeData.mjs tests/fixtures/gtfs/expired tests/scripts/validateGtfsRuntimeData.test.js
rtk git commit -m "feat: validate GTFS data quality"
```

## Task 6: Add GTFS Build Script

**Files:**
- Create: `scripts/build-gtfs-route-data.mjs`
- Modify: `package.json`
- Modify: `tests/scripts/packageScripts.test.js`
- Modify: `tests/scripts/publishedDataAssets.test.js`
- Test: `tests/scripts/buildGtfsRouteData.test.js`

- [ ] **Step 1: Write failing build script tests**

Create `tests/scripts/buildGtfsRouteData.test.js`:

```js
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGtfsRouteData } from '../../scripts/build-gtfs-route-data.mjs';

describe('buildGtfsRouteData', () => {
  it('writes runtime JSON assets and a quality report', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'gtfs-route-data-'));

    await buildGtfsRouteData({
      gtfsDirectory: new URL('../fixtures/gtfs/minimal/', import.meta.url),
      outputDirectory: new URL(`${outputDir}/`),
      aliases: {},
      localities: [
        { id: 'sanremo', label: 'Sanremo', aliases: [], stopIds: ['sanremo-autostazione'] },
        { id: 'imperia', label: 'Imperia', aliases: [], stopIds: ['imperia-porto-maurizio'] },
      ],
      localityRules: [],
      sourceUrl: 'https://example.com/gtfs.zip',
      builtAt: '2026-07-06T08:00:00.000Z',
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    const trips = JSON.parse(await readFile(new URL('trips.json', `file://${outputDir}/`), 'utf8'));
    const quality = JSON.parse(await readFile(new URL('data-quality.json', `file://${outputDir}/`), 'utf8'));
    const metadata = JSON.parse(await readFile(new URL('metadata.json', `file://${outputDir}/`), 'utf8'));

    expect(trips).toHaveLength(1);
    expect(quality.status).toBe('warning');
    expect(quality.counts.directPairs).toBeGreaterThan(0);
    expect(metadata.source.type).toBe('gtfs');
  });

  it('throws when quality validation fails', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'gtfs-route-data-expired-'));

    await expect(buildGtfsRouteData({
      gtfsDirectory: new URL('../fixtures/gtfs/expired/', import.meta.url),
      outputDirectory: new URL(`${outputDir}/`),
      aliases: {},
      localities: [],
      localityRules: [],
      sourceUrl: 'https://example.com/gtfs.zip',
      builtAt: '2026-07-06T08:00:00.000Z',
      now: new Date('2026-07-06T08:00:00.000Z'),
    })).rejects.toThrow('GTFS data validation failed: SOURCE_EXPIRED');
  });
});
```

- [ ] **Step 2: Update package script tests**

In `tests/scripts/packageScripts.test.js`, add:

```js
  it('exposes separate PDF and GTFS data build entry points', () => {
    expect(packageJson.scripts).toMatchObject({
      'build:data:pdf': 'node scripts/fetch-pdf.mjs && node scripts/extract-pages.mjs && node scripts/build-route-data.mjs && node scripts/build-stop-coordinates.mjs',
      'build:data:gtfs': 'node scripts/build-gtfs-route-data.mjs',
    });
  });
```

- [ ] **Step 3: Update published asset test for data quality**

In `tests/scripts/publishedDataAssets.test.js`, add the sidecar to `PUBLISHED_DATA_ASSETS`:

```js
  { path: '../../assets/data/data-quality.json', expectedType: 'object' },
```

- [ ] **Step 4: Run failing tests**

Run:

```bash
rtk npm test -- tests/scripts/buildGtfsRouteData.test.js tests/scripts/packageScripts.test.js tests/scripts/publishedDataAssets.test.js
```

Expected: FAIL because the build script and published sidecar do not exist yet.

- [ ] **Step 5: Implement the build script**

Create `scripts/build-gtfs-route-data.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadGtfsFeed } from './lib/gtfs/loadGtfsFeed.mjs';
import { normalizeGtfsData } from './lib/gtfs/normalizeGtfsData.mjs';
import { validateGtfsRuntimeData } from './lib/gtfs/validateGtfsRuntimeData.mjs';

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error?.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(outputDirectory, filename, value) {
  await writeFile(new URL(filename, outputDirectory), JSON.stringify(value, null, 2));
}

export async function buildGtfsRouteData({
  gtfsDirectory,
  outputDirectory,
  aliases,
  localities,
  localityRules,
  sourceUrl,
  builtAt = new Date().toISOString(),
  now = new Date(),
}) {
  const feed = await loadGtfsFeed(gtfsDirectory);
  const runtimeData = normalizeGtfsData({
    feed,
    aliases,
    localities,
    localityRules,
    sourceUrl,
    builtAt,
  });
  const quality = validateGtfsRuntimeData({ runtimeData, now });

  if (quality.status === 'failed') {
    throw new Error(`GTFS data validation failed: ${quality.errors.map((error) => error.code).join(', ')}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeJson(outputDirectory, 'trips.json', runtimeData.trips);
  await writeJson(outputDirectory, 'stops.json', runtimeData.stops);
  await writeJson(outputDirectory, 'lines.json', runtimeData.lines);
  await writeJson(outputDirectory, 'metadata.json', {
    ...runtimeData.metadata,
    quality: {
      status: quality.status,
      warningCount: quality.warnings.length,
      errorCount: quality.errors.length,
      reportUrl: './assets/data/data-quality.json',
    },
  });
  await writeJson(outputDirectory, 'localities.json', runtimeData.localities);
  await writeJson(outputDirectory, 'reachability.json', runtimeData.reachability);
  await writeJson(outputDirectory, 'stop-coordinates.json', runtimeData.stopCoordinates);
  await writeJson(outputDirectory, 'data-quality.json', quality);

  return { ...runtimeData, quality };
}

async function main() {
  const gtfsDirectory = new URL('../build/gtfs/', import.meta.url);
  const outputDirectory = new URL('../assets/data/', import.meta.url);
  const aliases = await readJson(new URL('../data/manual/stop-aliases.json', import.meta.url), {});
  const localities = await readJson(new URL('../data/manual/localities.json', import.meta.url), []);
  const localityRules = await readJson(new URL('../data/manual/locality-rules.json', import.meta.url), []);
  const sourceUrl = process.env.GTFS_SOURCE_URL ?? 'https://dati.regione.liguria.it/dataset/ds-637';

  const output = await buildGtfsRouteData({
    gtfsDirectory,
    outputDirectory,
    aliases,
    localities,
    localityRules,
    sourceUrl,
  });

  console.log(`Built ${output.trips.length} GTFS trips with ${output.quality.status} data quality`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
```

- [ ] **Step 6: Add package scripts**

In `package.json`, change scripts to include:

```json
"build:data": "node scripts/build-gtfs-route-data.mjs",
"build:data:pdf": "node scripts/fetch-pdf.mjs && node scripts/extract-pages.mjs && node scripts/build-route-data.mjs && node scripts/build-stop-coordinates.mjs",
"build:data:gtfs": "node scripts/build-gtfs-route-data.mjs"
```

- [ ] **Step 7: Add current published sidecar**

Create `assets/data/data-quality.json` matching current PDF data until GTFS data is actually generated for production:

```json
{
  "status": "fresh",
  "generatedAt": "2026-07-05T23:02:52.036Z",
  "source": {
    "type": "pdf",
    "validFrom": "2026-06-15",
    "validUntil": null
  },
  "counts": {
    "lines": 68,
    "stops": 315,
    "trips": 2000,
    "localities": 27,
    "directPairs": 2324
  },
  "errors": [],
  "warnings": []
}
```

- [ ] **Step 8: Verify build script tests pass**

Run:

```bash
rtk npm test -- tests/scripts/buildGtfsRouteData.test.js tests/scripts/packageScripts.test.js tests/scripts/publishedDataAssets.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
rtk git add scripts/build-gtfs-route-data.mjs package.json tests/scripts/buildGtfsRouteData.test.js tests/scripts/packageScripts.test.js tests/scripts/publishedDataAssets.test.js assets/data/data-quality.json
rtk git commit -m "feat: add GTFS data build entry point"
```

## Task 7: Add Data Freshness Formatting

**Files:**
- Create: `src/lib/dataFreshness.js`
- Test: `tests/lib/dataFreshness.test.js`

- [ ] **Step 1: Write failing formatter tests**

Create `tests/lib/dataFreshness.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildDataFreshnessViewModel } from '../../src/lib/dataFreshness.js';

describe('buildDataFreshnessViewModel', () => {
  it('formats GTFS source freshness for display', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: {
          type: 'gtfs',
          title: 'Regione Liguria GTFS planned-service feed',
          url: 'https://example.com/gtfs.zip',
          validFrom: '2026-06-14',
          validUntil: '2026-12-12',
          referencePdf: { title: 'PDF ufficiale', url: 'https://example.com/orario.pdf' },
        },
        builtAt: '2026-07-06T08:00:00.000Z',
        quality: { status: 'fresh', warningCount: 0, errorCount: 0 },
      },
      quality: null,
      locale: 'en',
    });

    expect(viewModel).toMatchObject({
      visible: true,
      status: 'fresh',
      sourceType: 'gtfs',
      chipText: 'Structured regional timetable · valid until Dec 12, 2026',
      builtLabel: 'Last built Jul 6, 2026',
      warningVisible: false,
      sourceUrl: 'https://example.com/gtfs.zip',
    });
  });

  it('uses data-quality sidecar status when present', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: { type: 'gtfs', validUntil: '2026-07-20' },
        builtAt: '2026-07-06T08:00:00.000Z',
      },
      quality: {
        status: 'warning',
        warnings: [{ code: 'SOURCE_ENDS_SOON', message: 'GTFS source validity range ends soon.' }],
      },
      locale: 'en',
    });

    expect(viewModel.status).toBe('warning');
    expect(viewModel.warningVisible).toBe(true);
    expect(viewModel.warningText).toBe('The timetable feed is near its validity limit. Check the linked official source before travelling.');
  });

  it('keeps current PDF metadata displayable during migration', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: { title: 'Orario ufficiale', effectiveDate: '2026-06-15' },
        builtAt: '2026-07-05T23:02:52.036Z',
      },
      quality: null,
      locale: 'en',
    });

    expect(viewModel.sourceType).toBe('pdf');
    expect(viewModel.chipText).toBe('Official PDF timetable · valid from Jun 15, 2026');
  });
});
```

- [ ] **Step 2: Run failing formatter tests**

Run:

```bash
rtk npm test -- tests/lib/dataFreshness.test.js
```

Expected: FAIL because `dataFreshness.js` does not exist.

- [ ] **Step 3: Implement formatter**

Create `src/lib/dataFreshness.js`:

```js
function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, locale) {
  const date = parseDate(value);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function sourceType(metadata) {
  return metadata?.source?.type ?? (metadata?.source?.effectiveDate ? 'pdf' : 'unknown');
}

function qualityStatus(metadata, quality) {
  return quality?.status ?? metadata?.quality?.status ?? 'fresh';
}

export function buildDataFreshnessViewModel({ metadata = null, quality = null, locale = 'en' } = {}) {
  if (!metadata?.source) {
    return { visible: false };
  }

  const type = sourceType(metadata);
  const status = qualityStatus(metadata, quality);
  const validUntil = metadata.source.validUntil;
  const validFrom = metadata.source.validFrom ?? metadata.source.effectiveDate;
  const chipText = type === 'gtfs' && validUntil
    ? `Structured regional timetable · valid until ${formatDate(validUntil, locale)}`
    : `Official PDF timetable · valid from ${formatDate(validFrom, locale)}`;

  return {
    visible: true,
    status,
    sourceType: type,
    chipText,
    builtLabel: metadata.builtAt ? `Last built ${formatDate(metadata.builtAt, locale)}` : '',
    validFromLabel: validFrom ? formatDate(validFrom, locale) : '',
    validUntilLabel: validUntil ? formatDate(validUntil, locale) : '',
    sourceTitle: metadata.source.title ?? '',
    sourceUrl: metadata.source.url ?? '',
    referencePdf: metadata.source.referencePdf ?? null,
    warningVisible: status === 'warning' || status === 'stale',
    warningText: 'The timetable feed is near its validity limit. Check the linked official source before travelling.',
  };
}
```

- [ ] **Step 4: Verify formatter tests pass**

Run:

```bash
rtk npm test -- tests/lib/dataFreshness.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/dataFreshness.js tests/lib/dataFreshness.test.js
rtk git commit -m "feat: format data freshness status"
```

## Task 8: Load Data Quality Sidecar At Bootstrap

**Files:**
- Modify: `src/lib/appBootstrap.js`
- Test: `tests/lib/appBootstrap.test.js`

- [ ] **Step 1: Add failing bootstrap test**

In `tests/lib/appBootstrap.test.js`, add:

```js
  it('loads data-quality sidecar when available', async () => {
    const payloads = {
      './assets/data/trips.json': [],
      './assets/data/stops.json': [],
      './assets/data/stop-coordinates.json': {},
      './assets/data/localities.json': [],
      './assets/data/reachability.json': {},
      './data/manual/localities.json': [],
      './assets/data/metadata.json': { source: { type: 'gtfs' } },
      './assets/data/data-quality.json': { status: 'fresh' },
    };

    const data = await loadAppBootstrapData({
      fetchJson: async (url) => payloads[url],
      fetchJsonOrNull: async (url) => payloads[url],
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(data.dataQuality).toEqual({ status: 'fresh' });
  });
```

- [ ] **Step 2: Run failing bootstrap test**

Run:

```bash
rtk npm test -- tests/lib/appBootstrap.test.js
```

Expected: FAIL because `dataQuality` is not loaded.

- [ ] **Step 3: Load optional quality sidecar**

In `src/lib/appBootstrap.js`, include `dataQuality` in the `Promise.all`:

```js
    optionalJson(fetchJsonOrNull, './assets/data/data-quality.json'),
```

Update destructuring and return:

```js
    dataQuality,
```

and:

```js
    dataQuality,
```

- [ ] **Step 4: Verify bootstrap tests pass**

Run:

```bash
rtk npm test -- tests/lib/appBootstrap.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/appBootstrap.js tests/lib/appBootstrap.test.js
rtk git commit -m "feat: load data quality sidecar"
```

## Task 9: Render Source Status In The App Shell

**Files:**
- Modify: `src/ui/renderShell.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Write failing shell tests**

In `tests/ui/renderShell.test.js`, replace the existing dataset freshness test with:

```js
  it('renders GTFS source status as a details chip when metadata is available', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      datasetInfo: {
        source: {
          type: 'gtfs',
          title: 'Regione Liguria GTFS planned-service feed',
          url: 'https://example.com/gtfs.zip',
          validFrom: '2026-06-14',
          validUntil: '2026-12-12',
          referencePdf: { title: 'PDF ufficiale', url: 'https://example.com/orario.pdf' },
        },
        builtAt: '2026-07-06T08:00:00.000Z',
        quality: { status: 'fresh', warningCount: 0, errorCount: 0 },
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('class="dataset-freshness dataset-freshness--fresh"');
    expect(html).toContain('Structured regional timetable');
    expect(html).toContain('Regione Liguria GTFS planned-service feed');
    expect(html).toContain('Last built');
    expect(html).toContain('https://example.com/gtfs.zip');
    expect(html).toContain('PDF ufficiale');
  });

  it('renders a warning banner for warning data quality', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      datasetInfo: {
        source: { type: 'gtfs', validUntil: '2026-07-20' },
        builtAt: '2026-07-06T08:00:00.000Z',
        quality: { status: 'warning', warningCount: 1, errorCount: 0 },
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('class="dataset-warning"');
    expect(html).toContain('The timetable feed is near its validity limit');
    expect(html.indexOf('class="dataset-warning"')).toBeLessThan(html.indexOf('<section>Body</section>'));
  });
```

- [ ] **Step 2: Run failing shell tests**

Run:

```bash
rtk npm test -- tests/ui/renderShell.test.js
```

Expected: FAIL because the shell still renders the old PDF-only marker.

- [ ] **Step 3: Implement shell rendering**

In `src/ui/renderShell.js`, import:

```js
import { buildDataFreshnessViewModel } from '../lib/dataFreshness.js';
```

Replace `renderFreshnessMarker` with:

```js
function renderFreshnessMarker(datasetInfo, t, language) {
  const freshness = buildDataFreshnessViewModel({
    metadata: datasetInfo,
    quality: datasetInfo?.quality ?? null,
    locale: language,
  });

  if (!freshness.visible) {
    return '';
  }

  return `
    <details class="dataset-freshness dataset-freshness--${escapeHtml(freshness.status)}">
      <summary>${escapeHtml(freshness.chipText)}</summary>
      <div class="dataset-freshness-panel">
        ${freshness.sourceTitle ? `<p><strong>${escapeHtml(freshness.sourceTitle)}</strong></p>` : ''}
        ${freshness.builtLabel ? `<p>${escapeHtml(freshness.builtLabel)}</p>` : ''}
        ${freshness.sourceUrl ? `<a href="${escapeHtml(freshness.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('shell.dataSource'))}</a>` : ''}
        ${freshness.referencePdf ? `<p>${escapeHtml(t('shell.referencePdf'))}: ${escapeHtml(freshness.referencePdf.title)}</p>` : ''}
      </div>
    </details>
  `;
}

function renderFreshnessWarning(datasetInfo, t, language) {
  const freshness = buildDataFreshnessViewModel({
    metadata: datasetInfo,
    quality: datasetInfo?.quality ?? null,
    locale: language,
  });

  if (!freshness.warningVisible) {
    return '';
  }

  return `<p class="dataset-warning" role="status">${escapeHtml(freshness.warningText)}</p>`;
}
```

Update the header call:

```js
          ${renderFreshnessMarker(datasetInfo, t, language)}
```

Render the warning before content:

```js
      ${renderFreshnessWarning(datasetInfo, t, language)}
      ${content}
```

- [ ] **Step 4: Add translation keys**

In every language object in `src/lib/i18n.js`, add these keys using English fallback copy if needed:

```js
'shell.dataSource': 'Data source',
'shell.referencePdf': 'PDF reference',
```

- [ ] **Step 5: Verify shell tests pass**

Run:

```bash
rtk npm test -- tests/ui/renderShell.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/ui/renderShell.js src/lib/i18n.js tests/ui/renderShell.test.js
rtk git commit -m "feat: render data freshness status"
```

## Task 10: Render Result Source Copy And Feed-Only Labels

**Files:**
- Modify: `src/ui/renderResults.js`
- Modify: `src/lib/i18n.js`
- Test: `tests/ui/renderResults.test.js`

- [ ] **Step 1: Write failing result-source tests**

In `tests/ui/renderResults.test.js`, add:

```js
  it('renders GTFS source copy and feed-only labels when PDF page is unavailable', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/orario.pdf',
      sourceInfo: { type: 'gtfs' },
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
          sourcePage: null,
        },
      ],
      allDepartures: [],
    });

    expect(html).toContain('Times generated from Regione Liguria GTFS planned-service data');
    expect(html).toContain('Feed source only');
    expect(html).not.toContain('Open PDF');
  });
```

- [ ] **Step 2: Run failing result tests**

Run:

```bash
rtk npm test -- tests/ui/renderResults.test.js
```

Expected: FAIL because `sourceInfo` is ignored.

- [ ] **Step 3: Implement result source copy**

In `src/ui/renderResults.js`, update `renderDepartureCard`:

```js
function renderDepartureCard(departure, t, pdfUrl, { compact = false } = {}) {
```

Change PDF action:

```js
  const pdfAction = compact
    ? ''
    : departure.sourcePage
      ? `<a href="${pdfHref(pdfUrl, departure.sourcePage)}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>`
      : `<span>${escapeHtml(t('results.feedSourceOnly'))}</span>`;
```

Add source copy renderer:

```js
function renderSourceNote(sourceInfo, t) {
  if (sourceInfo?.type !== 'gtfs') {
    return '';
  }

  return `<p class="results-source-note">${escapeHtml(t('results.gtfsSourceNote'))}</p>`;
}
```

Add `sourceInfo = null` to `renderResultsView` arguments and render after summary metrics:

```js
        ${renderSummaryMetrics(summary, t)}
        ${renderSourceNote(sourceInfo, t)}
```

- [ ] **Step 4: Add result translation keys**

In every language object in `src/lib/i18n.js`, add:

```js
'results.gtfsSourceNote': 'Times generated from Regione Liguria GTFS planned-service data. PDF link kept for operator verification when available.',
'results.feedSourceOnly': 'Feed source only',
```

- [ ] **Step 5: Verify result tests pass**

Run:

```bash
rtk npm test -- tests/ui/renderResults.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/ui/renderResults.js src/lib/i18n.js tests/ui/renderResults.test.js
rtk git commit -m "feat: label GTFS result sources"
```

## Task 11: Pass Source Info Through Main Render State

**Files:**
- Modify: `src/main.js`
- Test: `tests/e2e/app-flow.spec.js` or add focused UI test if main render tests exist

- [ ] **Step 1: Locate `renderShell` and `renderResultsView` call sites**

Run:

```bash
rtk rg -n "renderShell|renderResultsView|datasetInfo" src/main.js
```

Expected: see the shell render receives `metadata`, and result rendering has access to app state.

- [ ] **Step 2: Pass loaded quality into shell dataset info**

In `src/main.js`, ensure the object passed as `datasetInfo` includes:

```js
datasetInfo: {
  ...state.metadata,
  quality: state.dataQuality ?? state.metadata?.quality ?? null,
}
```

Use the actual state variable names from `src/main.js`; do not create duplicate state if bootstrap already stores `metadata`.

- [ ] **Step 3: Pass GTFS source type into results**

At the `renderResultsView` call site, pass:

```js
sourceInfo: {
  type: state.metadata?.source?.type ?? (state.metadata?.source?.effectiveDate ? 'pdf' : 'unknown'),
}
```

- [ ] **Step 4: Run targeted browser/UI tests**

Run:

```bash
rtk npm test -- tests/ui/renderShell.test.js tests/ui/renderResults.test.js tests/lib/appBootstrap.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/main.js
rtk git commit -m "feat: pass data source state into UI"
```

## Task 12: Add SEO Freshness Rendering

**Files:**
- Modify: `scripts/lib/renderSeoPageHtml.mjs`
- Test: `tests/scripts/renderSeoPageHtml.test.js`

- [ ] **Step 1: Write failing SEO freshness test**

In `tests/scripts/renderSeoPageHtml.test.js`, add a GTFS metadata fixture:

```js
const gtfsMetadata = {
  source: {
    type: 'gtfs',
    title: 'Regione Liguria GTFS planned-service feed',
    url: 'https://example.com/gtfs.zip',
    validFrom: '2026-06-14',
    validUntil: '2026-12-12',
    referencePdf: { title: 'PDF ufficiale Riviera Trasporti', url: 'https://example.com/orario.pdf' },
  },
  builtAt: '2026-07-06T08:00:00.000Z',
  quality: { status: 'fresh', warningCount: 0, errorCount: 0 },
};
```

Add a test:

```js
  it('renders GTFS source freshness on generated pages', () => {
    const html = renderRoutePageHtml({
      site,
      metadata: gtfsMetadata,
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo',
        lineIds: ['12'],
        dayTypes: ['feriale'],
        departures: [],
      },
    });

    expect(html).toContain('Dati pianificati GTFS Regione Liguria');
    expect(html).toContain('validi fino al 2026-12-12');
    expect(html).toContain('https://example.com/gtfs.zip');
    expect(html).toContain('PDF ufficiale Riviera Trasporti');
  });
```

- [ ] **Step 2: Run failing SEO test**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: FAIL because generated pages still render PDF-only footer source text.

- [ ] **Step 3: Implement SEO source summary**

In `scripts/lib/renderSeoPageHtml.mjs`, add:

```js
function renderSourceSummary(metadata) {
  const source = metadata?.source ?? {};

  if (source.type === 'gtfs') {
    return `
      <section class="seo-source-summary">
        <h2>Dati pianificati GTFS Regione Liguria</h2>
        <p>Orari da ${escapeHtml(source.title ?? 'feed GTFS Regione Liguria')}${source.validUntil ? `, validi fino al ${escapeHtml(source.validUntil)}` : ''}.</p>
        ${source.url ? `<p><a href="${escapeAttribute(source.url)}" rel="noreferrer">Fonte dati strutturata</a></p>` : ''}
        ${source.referencePdf?.title ? `<p>Riferimento PDF: ${escapeHtml(source.referencePdf.title)}.</p>` : ''}
      </section>
    `;
  }

  const sourceTitle = source.title ?? 'orario ufficiale';
  const effectiveDate = source.effectiveDate;
  const builtAt = metadata?.builtAt;

  return `
      <p>Dati da ${escapeHtml(sourceTitle)}${effectiveDate ? `, validi dal ${escapeHtml(effectiveDate)}` : ''}.</p>
      ${builtAt ? `<p>Pagina generata il ${escapeHtml(builtAt)}.</p>` : ''}
  `;
}
```

Then replace the footer body in `renderLayout` with:

```js
      ${renderSourceSummary(metadata)}
```

- [ ] **Step 4: Verify SEO tests pass**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add scripts/lib/renderSeoPageHtml.mjs tests/scripts/renderSeoPageHtml.test.js
rtk git commit -m "feat: show GTFS freshness on SEO pages"
```

## Task 13: Verify Existing App Flows Against New Data Contract

**Files:**
- Modify only files required by failing tests.
- Tests: existing app, UI, lib, and script tests.

- [ ] **Step 1: Run full unit suite**

Run:

```bash
rtk npm test
```

Expected: PASS. If failures occur, fix only issues directly caused by the GTFS data freshness changes.

- [ ] **Step 2: Run smoke tests**

Run:

```bash
rtk npm run test:smoke
```

Expected: PASS. This may require the local server behavior already configured in Playwright.

- [ ] **Step 3: Run data build command in the current supported mode**

Run:

```bash
rtk npm run build:data:pdf
```

Expected: PASS and existing PDF data assets regenerate successfully. This confirms the fallback/reference pipeline is intact.

- [ ] **Step 4: Stop on compatibility failures**

If Step 1-3 fail, stop execution and record the failing command, exit status, and first actionable error in the task notes before making another code change. Do not continue into documentation or final verification while a route-flow regression is present.

## Task 14: Document Live GTFS Feed Setup

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-06-gtfs-primary-data-freshness-design.md` only if implementation decisions close open questions.

- [ ] **Step 1: Add README build notes**

In `README.md`, update the Development data-build section to include:

Build static route data from a prepared GTFS feed directory:

    GTFS_SOURCE_URL="https://dati.regione.liguria.it/dataset/ds-637" npm run build:data:gtfs

The GTFS builder expects extracted feed files in `build/gtfs/`. Use `npm run build:data:pdf` to rebuild the legacy PDF-derived data while the GTFS migration is being validated.

- [ ] **Step 2: Run package/doc-adjacent tests**

Run:

```bash
rtk npm test -- tests/scripts/packageScripts.test.js tests/scripts/publishedDataAssets.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit docs**

```bash
rtk git add README.md docs/superpowers/specs/2026-07-06-gtfs-primary-data-freshness-design.md
rtk git commit -m "docs: explain GTFS data build flow"
```

## Task 15: Final Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Run full verification**

Run:

```bash
rtk npm test
rtk npm run test:smoke
```

Expected: both commands pass.

- [ ] **Step 2: Inspect final diff**

Run:

```bash
rtk git status --short
rtk git log --oneline -8
```

Expected: working tree is clean after all task commits. Recent commits correspond to this plan.

- [ ] **Step 3: Prepare summary**

Report:

- GTFS parser and builder files added.
- Data-quality sidecar added.
- App shell/results/SEO freshness UI added.
- Verification commands and pass/fail outcomes.

Do not claim the migration is production-complete until a real Regione Liguria GTFS archive has been downloaded, extracted into `build/gtfs/`, built, reviewed through `assets/data/data-quality.json`, and checked in the browser.
