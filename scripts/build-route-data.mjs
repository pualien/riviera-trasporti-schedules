import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { normalizeText } from '../src/lib/normalize.js';
import { parsePdfIndex } from './lib/parsePdfIndex.mjs';
import { parseTimetablePage } from './lib/parseTimetablePage.mjs';
import { PDF_SOURCE_METADATA } from './lib/pdfSource.mjs';

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

function stopMatchesLocalityRule(stop, rule) {
  const stopTokens = [
    stop.canonical,
    ...(stop.variants ?? []),
    ...(stop.matchTokens ?? []),
  ].map(normalizeText);
  const ruleTokens = [
    rule.label,
    ...(rule.aliases ?? []),
    ...(rule.matchTokens ?? []),
  ].map(normalizeText);

  return stopTokens.some((stopToken) =>
    ruleTokens.some((ruleToken) =>
      stopToken === ruleToken
      || stopToken.startsWith(`${ruleToken} `)
      || stopToken.includes(` ${ruleToken} `)
      || stopToken.endsWith(` ${ruleToken}`),
    ));
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
  localityRules = [],
  builtAt = new Date().toISOString(),
}) {
  const availablePageNumbers = new Set(pages.map((page) => page.pageNumber));
  const indexEntriesInPdf = availablePageNumbers.size
    ? indexEntries.filter((indexEntry) => availablePageNumbers.has(indexEntry.pageNumber))
    : indexEntries;
  const missingEntries = indexEntriesInPdf.filter(
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

  const stops = buildStops(trips, aliases);
  const generatedLocalities = deriveLocalitiesFromRules(localityRules, stops);
  const validatedLocalities = validateLocalities(
    mergeLocalities(localities, generatedLocalities),
    stops,
  );

  return {
    lines: buildLines(manifestEntries),
    stops,
    trips,
    localities: validatedLocalities,
    reachability: buildReachability(trips),
    metadata: buildDatasetMetadata({ indexEntries: indexEntriesInPdf, manifestEntries, builtAt }),
  };
}

async function main() {
  const manifestEntries = JSON.parse(
    await readFile(new URL('../data/manual/line-pages.json', import.meta.url), 'utf8'),
  );
  const aliases = JSON.parse(
    await readFile(new URL('../data/manual/stop-aliases.json', import.meta.url), 'utf8'),
  );
  const localities = JSON.parse(
    await readFile(new URL('../data/manual/localities.json', import.meta.url), 'utf8'),
  );
  const localityRules = JSON.parse(
    await readFile(new URL('../data/manual/locality-rules.json', import.meta.url), 'utf8'),
  );
  const pages = JSON.parse(await readFile(new URL('../build/raw/pages.json', import.meta.url), 'utf8'));
  const indexPage = pages.find((page) => page.pageNumber === 2);

  if (!indexPage) {
    throw new Error('Missing PDF index page in extracted pages');
  }

  const indexEntries = parsePdfIndex({ pageItems: indexPage.items });
  const output = await buildRouteData({
    indexEntries,
    manifestEntries,
    pages,
    aliases,
    localities,
    localityRules,
  });

  await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
  await writeFile(new URL('../assets/data/trips.json', import.meta.url), JSON.stringify(output.trips, null, 2));
  await writeFile(new URL('../assets/data/stops.json', import.meta.url), JSON.stringify(output.stops, null, 2));
  await writeFile(new URL('../assets/data/lines.json', import.meta.url), JSON.stringify(output.lines, null, 2));
  await writeFile(
    new URL('../assets/data/metadata.json', import.meta.url),
    JSON.stringify(output.metadata, null, 2),
  );
  await writeFile(
    new URL('../assets/data/localities.json', import.meta.url),
    JSON.stringify(output.localities, null, 2),
  );
  await writeFile(
    new URL('../assets/data/reachability.json', import.meta.url),
    JSON.stringify(output.reachability, null, 2),
  );

  console.log(`Built ${output.trips.length} trips across ${indexEntries.length} indexed pages`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
