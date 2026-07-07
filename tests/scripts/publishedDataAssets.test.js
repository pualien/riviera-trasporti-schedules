import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PUBLISHED_DATA_ASSETS = [
  { path: '../../assets/data/metadata.json', expectedType: 'object' },
  { path: '../../assets/data/localities.json', expectedType: 'array' },
  { path: '../../assets/data/reachability.json', expectedType: 'object' },
  { path: '../../assets/data/stop-coordinates.json', expectedType: 'object' },
  { path: '../../assets/data/data-quality.json', expectedType: 'object' },
];

describe('published data assets', () => {
  it('keeps every optional production JSON sidecar present and parseable', async () => {
    for (const asset of PUBLISHED_DATA_ASSETS) {
      const raw = await readFile(new URL(asset.path, import.meta.url), 'utf8');
      const parsed = JSON.parse(raw);

      if (asset.expectedType === 'array') {
        expect(Array.isArray(parsed), asset.path).toBe(true);
        continue;
      }

      expect(parsed, asset.path).not.toBeNull();
      expect(Array.isArray(parsed), asset.path).toBe(false);
      expect(typeof parsed, asset.path).toBe(asset.expectedType);
    }
  });

  it('publishes enough broad localities to make area-first search meaningful', async () => {
    const [localities, reachability] = await Promise.all([
      readFile(new URL('../../assets/data/localities.json', import.meta.url), 'utf8').then(JSON.parse),
      readFile(new URL('../../assets/data/reachability.json', import.meta.url), 'utf8').then(JSON.parse),
    ]);
    const coveredStopIds = new Set(localities.flatMap((locality) => locality.stopIds ?? []));
    const departureStopIds = Object.entries(reachability)
      .filter(([, destinations]) => destinations.length > 0)
      .map(([stopId]) => stopId);
    const coveredDepartureCount = departureStopIds.filter((stopId) => coveredStopIds.has(stopId)).length;

    expect(localities.length).toBeGreaterThanOrEqual(25);
    expect(coveredDepartureCount / departureStopIds.length).toBeGreaterThanOrEqual(0.4);
    expect(localities.map((locality) => locality.id)).toEqual(expect.arrayContaining([
      'andora',
      'imperia',
      'sanremo',
      'ventimiglia',
    ]));
  });

  it('publishes usable stop coordinates for selected-trip maps', async () => {
    const coordinates = JSON.parse(
      await readFile(new URL('../../assets/data/stop-coordinates.json', import.meta.url), 'utf8'),
    );
    const usableCoordinates = Object.entries(coordinates).filter(([, coords]) =>
      Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude),
    );

    expect(usableCoordinates.length).toBeGreaterThanOrEqual(20);
    expect(coordinates).toEqual(expect.objectContaining({
      'imperia-oneglia': expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
      }),
      'imperia-porto-maurizio': expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
      }),
      'sanremo-autostazione': expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
      }),
    }));
  });
});
