import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseTimetablePage } from './lib/parseTimetablePage.mjs';

const linePages = JSON.parse(
  await readFile(new URL('../data/manual/line-pages.json', import.meta.url), 'utf8'),
);
const aliases = JSON.parse(
  await readFile(new URL('../data/manual/stop-aliases.json', import.meta.url), 'utf8'),
);
const pages = JSON.parse(await readFile(new URL('../build/raw/pages.json', import.meta.url), 'utf8'));

const trips = linePages.flatMap((config) => {
  const page = pages.find((entry) => entry.pageNumber === config.pageNumber);

  if (!page) {
    return [];
  }

  return parseTimetablePage({ ...config, pageText: page.text, pageItems: page.items });
});

const stops = Object.entries(aliases).map(([canonical, variants]) => ({ canonical, variants }));
const lines = [...new Set(trips.map((trip) => trip.lineId))].map((lineId) => ({ lineId }));

await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/data/trips.json', import.meta.url), JSON.stringify(trips, null, 2));
await writeFile(new URL('../assets/data/stops.json', import.meta.url), JSON.stringify(stops, null, 2));
await writeFile(new URL('../assets/data/lines.json', import.meta.url), JSON.stringify(lines, null, 2));

console.log(`Built ${trips.length} trips`);
