import { describe, expect, it, vi } from 'vitest';
import { buildNearbyStopChoices, createNearbyStopCacheKey } from '../../src/lib/nearbyStops.js';

describe('buildNearbyStopChoices', () => {
  const stops = [
    { id: 'diano-marina-capolinea-c-battisti', canonical: 'diano marina capolinea c.battisti', variants: ['diano marina'] },
    { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
  ];
  const localities = [
    {
      id: 'porto-maurizio',
      label: 'Porto Maurizio',
      stopIds: ['imperia-porto-maurizio'],
      matchTokens: ['porto maurizio'],
    },
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
      localities,
      fetchNearbyStops: provider,
      limit: 5,
    });

    expect(choices).toEqual([
      expect.objectContaining({
        stopId: 'imperia-porto-maurizio',
        distanceMeters: 180,
        localityId: 'porto-maurizio',
        localityLabel: 'Porto Maurizio',
      }),
      expect.objectContaining({ stopId: 'sanremo-autostazione', distanceMeters: 420 }),
    ]);
  });

  it('matches a town-level provider result to a manual timetable stop alias', async () => {
    const provider = vi.fn().mockResolvedValue([
      { label: 'Diano Marina', distanceMeters: 120, lat: 43.91, lon: 8.08 },
    ]);

    const choices = await buildNearbyStopChoices({
      latitude: 43.91,
      longitude: 8.08,
      stops,
      aliases: {
        'diano marina capolinea c.battisti': ['diano marina'],
      },
      localities,
      fetchNearbyStops: provider,
      limit: 5,
    });

    expect(choices).toEqual([
      expect.objectContaining({
        stopId: 'diano-marina-capolinea-c-battisti',
        canonical: 'diano marina capolinea c.battisti',
      }),
    ]);
  });

  it('builds stable cache keys for rounded coordinates', () => {
    expect(createNearbyStopCacheKey(43.88644, 8.02891)).toBe('43.886|8.029');
  });
});
