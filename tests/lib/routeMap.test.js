import { describe, expect, it } from 'vitest';
import { buildRouteMapState } from '../../src/lib/routeMap.js';

describe('buildRouteMapState', () => {
  it('returns map points when every segment stop has coordinates', () => {
    const state = buildRouteMapState({
      lineId: '12',
      segmentStops: [
        { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
        { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
      ],
    }, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
    });

    expect(state.hasMap).toBe(true);
    expect(state.points).toEqual([
      { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20', latitude: 43.886, longitude: 8.029 },
      { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45', latitude: 43.846, longitude: 7.852 },
    ]);
  });

  it('returns a fallback state when any segment stop is missing coordinates', () => {
    const state = buildRouteMapState({
      lineId: '12',
      segmentStops: [
        { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
        { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
      ],
    }, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
    });

    expect(state.hasMap).toBe(false);
    expect(state.missingStopIds).toEqual(['taggia-stazione']);
    expect(state.stops).toHaveLength(2);
  });
});
