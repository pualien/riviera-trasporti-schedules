import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { normalizeText } from '../src/lib/normalize.js';
import { parsePdfIndex } from './lib/parsePdfIndex.mjs';
import { parseTimetablePage } from './lib/parseTimetablePage.mjs';

function stopIdFromName(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

function createStopRecord(canonical, variants) {
  return {
    id: stopIdFromName(canonical),
    canonical,
    variants,
  };
}

function attachStopIds(trip) {
  return {
    ...trip,
    stops: trip.stops.map((stop) => ({
      ...stop,
      stopId: stopIdFromName(stop.name),
    })),
  };
}

function buildLines(manifestEntries) {
  return [...new Set(manifestEntries.map((entry) => entry.lineId))].map((lineId) => ({
    lineId,
    pages: manifestEntries.filter((entry) => entry.lineId === lineId).map((entry) => entry.pageNumber),
  }));
}

function buildStops(trips, aliases) {
  const stopNames = [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.name)))];

  return stopNames.map((name) => createStopRecord(name, aliases[name] ?? []));
}

export async function buildRouteData({ indexEntries, manifestEntries, pages, aliases }) {
  const missingEntries = indexEntries.filter(
    (indexEntry) =>
      !manifestEntries.some(
        (manifestEntry) =>
          manifestEntry.lineId === indexEntry.lineId &&
          manifestEntry.pageNumber === indexEntry.pageNumber &&
          manifestEntry.direction === indexEntry.direction,
      ),
  );

  if (missingEntries.length) {
    throw new Error(`Missing indexed timetable pages: ${missingEntries.length}`);
  }

  const trips = manifestEntries.flatMap((config) => {
    const page = pages.find((entry) => entry.pageNumber === config.pageNumber);

    if (!page) {
      throw new Error(`Missing page payload for ${config.lineId} page ${config.pageNumber}`);
    }

    const parsedTrips = parseTimetablePage({
      ...config,
      dayType: config.dayType ?? config.serviceNote,
      pageText: page.text,
      pageItems: page.items,
    });

    if (!parsedTrips.length) {
      throw new Error(`Parsed zero trips for ${config.lineId} page ${config.pageNumber}`);
    }

    return parsedTrips.map(attachStopIds);
  });

  return {
    lines: buildLines(manifestEntries),
    stops: buildStops(trips, aliases),
    trips,
  };
}

async function main() {
  const manifestEntries = JSON.parse(
    await readFile(new URL('../data/manual/line-pages.json', import.meta.url), 'utf8'),
  );
  const aliases = JSON.parse(
    await readFile(new URL('../data/manual/stop-aliases.json', import.meta.url), 'utf8'),
  );
  const pages = JSON.parse(await readFile(new URL('../build/raw/pages.json', import.meta.url), 'utf8'));
  const indexPage = pages.find((page) => page.pageNumber === 2);

  if (!indexPage) {
    throw new Error('Missing PDF index page in extracted pages');
  }

  const indexEntries = parsePdfIndex({ pageItems: indexPage.items });
  const output = await buildRouteData({ indexEntries, manifestEntries, pages, aliases });

  await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
  await writeFile(new URL('../assets/data/trips.json', import.meta.url), JSON.stringify(output.trips, null, 2));
  await writeFile(new URL('../assets/data/stops.json', import.meta.url), JSON.stringify(output.stops, null, 2));
  await writeFile(new URL('../assets/data/lines.json', import.meta.url), JSON.stringify(output.lines, null, 2));

  console.log(`Built ${output.trips.length} trips across ${indexEntries.length} indexed pages`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
