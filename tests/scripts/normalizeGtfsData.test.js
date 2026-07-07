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
      stopIdOverrides: {
        'Imperia Porto Maurizio': 'legacy-imperia-stop',
      },
      stopLabelOverrides: {
        'legacy-imperia-stop': {
          canonical: 'Porto Maurizio',
          variants: ['Pensilina Porto Maurizio', 'Imperia Porto Maurizio'],
        },
        'Sanremo Autostazione': {
          canonical: 'Sanremo Autostazione',
          variants: ['SANREMO Autostazione ARRIVO'],
        },
      },
      sourceUrl: 'https://example.com/gtfs.zip',
      builtAt: '2026-07-06T08:00:00.000Z',
    });

    expect(output.lines).toEqual([{ lineId: '12', pages: [] }]);
    expect(output.stops).toContainEqual({
      id: 'legacy-imperia-stop',
      canonical: 'Porto Maurizio',
      variants: ['Pensilina Porto Maurizio', 'Imperia Porto Maurizio'],
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
      { name: 'Imperia Porto Maurizio', time: '06:20', stopId: 'legacy-imperia-stop' },
      { name: 'Sanremo Autostazione', time: '07:00', stopId: 'sanremo-autostazione' },
    ]);
    expect(output.localities).toContainEqual(
      expect.objectContaining({ id: 'imperia', stopIds: ['legacy-imperia-stop'] }),
    );
    expect(output.reachability['legacy-imperia-stop']).toEqual(['sanremo-autostazione']);
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
