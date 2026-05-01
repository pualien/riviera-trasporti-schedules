import { describe, expect, it, vi } from 'vitest';
import { buildNearbyStopChoices, createNearbyStopCacheKey } from '../../src/lib/nearbyStops.js';

describe('buildNearbyStopChoices', () => {
  const stops = [
    { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
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
      fetchNearbyStops: provider,
      limit: 5,
    });

    expect(choices).toEqual([
      expect.objectContaining({ stopId: 'imperia-porto-maurizio', distanceMeters: 180 }),
      expect.objectContaining({ stopId: 'sanremo-autostazione', distanceMeters: 420 }),
    ]);
  });

  it('builds stable cache keys for rounded coordinates', () => {
    expect(createNearbyStopCacheKey(43.88644, 8.02891)).toBe('43.886|8.029');
  });
});
