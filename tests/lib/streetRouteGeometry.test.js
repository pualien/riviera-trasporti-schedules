import { describe, expect, it, vi } from 'vitest';
import {
  buildOsrmRouteUrl,
  buildStreetRouteGeometryKey,
  decodeOsrmRouteGeometry,
  fetchStreetRouteGeometry,
} from '../../src/lib/streetRouteGeometry.js';

const points = [
  { stopId: 'imperia-porto-maurizio', latitude: 43.886, longitude: 8.029 },
  { stopId: 'sanremo-autostazione', latitude: 43.817, longitude: 7.777 },
];

describe('street route geometry', () => {
  it('builds an OSRM URL with longitude-latitude coordinate order', () => {
    expect(buildOsrmRouteUrl(points)).toBe(
      'https://router.project-osrm.org/route/v1/driving/8.029,43.886;7.777,43.817?overview=full&geometries=geojson&continue_straight=false',
    );
  });

  it('returns null when fewer than two mapped stops are available', () => {
    expect(buildOsrmRouteUrl([points[0]])).toBeNull();
  });

  it('decodes GeoJSON coordinates into Leaflet latitude-longitude order', () => {
    expect(decodeOsrmRouteGeometry({
      routes: [
        {
          geometry: {
            coordinates: [
              [8.029, 43.886],
              [7.950, 43.870],
            ],
          },
        },
      ],
    })).toEqual([
      [43.886, 8.029],
      [43.870, 7.950],
    ]);
  });

  it('fetches street geometry and falls back to an empty geometry on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            geometry: {
              coordinates: [[8.029, 43.886]],
            },
          },
        ],
      }),
    });

    await expect(fetchStreetRouteGeometry(points, { fetchImpl })).resolves.toEqual([[43.886, 8.029]]);
    await expect(fetchStreetRouteGeometry(points, {
      fetchImpl: vi.fn().mockResolvedValue({ ok: false }),
    })).resolves.toEqual([]);
  });

  it('creates a stable cache key from stop ids and rounded coordinates', () => {
    expect(buildStreetRouteGeometryKey(points)).toBe(
      'imperia-porto-maurizio:43.88600,8.02900|sanremo-autostazione:43.81700,7.77700',
    );
  });
});
