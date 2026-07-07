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
