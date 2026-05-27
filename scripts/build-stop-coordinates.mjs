import { mkdir, readFile, writeFile } from 'node:fs/promises';

function isUsableCoordinate(entry) {
  return Number.isFinite(entry?.latitude) && Number.isFinite(entry?.longitude);
}

export function buildStopCoordinates({
  stops = [],
  coordinateOverrides = [],
} = {}) {
  const stopIds = new Set(stops.map((stop) => stop.id));
  const coordinates = {};

  for (const entry of coordinateOverrides) {
    if (!stopIds.has(entry.stopId)) {
      throw new Error(`Unknown coordinate stop id: ${entry.stopId}`);
    }

    if (!isUsableCoordinate(entry)) {
      throw new Error(`Invalid coordinates for stop id: ${entry.stopId}`);
    }

    coordinates[entry.stopId] = {
      latitude: entry.latitude,
      longitude: entry.longitude,
    };
  }

  return coordinates;
}

async function main() {
  const stops = JSON.parse(
    await readFile(new URL('../assets/data/stops.json', import.meta.url), 'utf8'),
  );
  const coordinateOverrides = JSON.parse(
    await readFile(new URL('../data/manual/stop-coordinate-overrides.json', import.meta.url), 'utf8'),
  );
  const coordinates = buildStopCoordinates({ stops, coordinateOverrides });

  await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../assets/data/stop-coordinates.json', import.meta.url),
    JSON.stringify(coordinates, null, 2),
  );

  console.log(`Built ${Object.keys(coordinates).length} stop coordinates`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
