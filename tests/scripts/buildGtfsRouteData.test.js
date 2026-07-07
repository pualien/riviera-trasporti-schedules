import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildGtfsRouteData } from '../../scripts/build-gtfs-route-data.mjs';

describe('buildGtfsRouteData', () => {
  it('writes runtime JSON assets and a quality report', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'gtfs-route-data-'));

    await buildGtfsRouteData({
      gtfsDirectory: new URL('../fixtures/gtfs/minimal/', import.meta.url),
      outputDirectory: pathToFileURL(`${outputDir}/`),
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

    const outputUrl = pathToFileURL(`${outputDir}/`);
    const trips = JSON.parse(await readFile(new URL('trips.json', outputUrl), 'utf8'));
    const quality = JSON.parse(await readFile(new URL('data-quality.json', outputUrl), 'utf8'));
    const metadata = JSON.parse(await readFile(new URL('metadata.json', outputUrl), 'utf8'));

    expect(trips).toHaveLength(1);
    expect(quality.status).toBe('warning');
    expect(quality.counts.directPairs).toBeGreaterThan(0);
    expect(metadata.source.type).toBe('gtfs');
  });

  it('throws when quality validation fails', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'gtfs-route-data-expired-'));

    await expect(buildGtfsRouteData({
      gtfsDirectory: new URL('../fixtures/gtfs/expired/', import.meta.url),
      outputDirectory: pathToFileURL(`${outputDir}/`),
      aliases: {},
      localities: [],
      localityRules: [],
      sourceUrl: 'https://example.com/gtfs.zip',
      builtAt: '2026-07-06T08:00:00.000Z',
      now: new Date('2026-07-06T08:00:00.000Z'),
    })).rejects.toThrow('GTFS data validation failed: SOURCE_EXPIRED');
  });
});
