import { describe, expect, it } from 'vitest';
import { buildRouteMapState } from '../../src/lib/routeMap.js';

const match = {
  lineId: '12',
  segmentStops: [
    { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
    { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
    { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
  ],
};

describe('buildRouteMapState', () => {
  it('uses street geometry when route coordinates are available', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    }, {
      routeGeometry: [
        [43.886, 8.029],
        [43.870, 7.950],
        [43.817, 7.777],
      ],
    });

    expect(state.geometryStatus).toBe('street-estimate');
    expect(state.geometryPoints).toEqual([
      [43.886, 8.029],
      [43.870, 7.950],
      [43.817, 7.777],
    ]);
  });

  it('falls back to stop-to-stop geometry when street geometry is unavailable', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.geometryStatus).toBe('stop-segment');
    expect(state.geometryPoints).toEqual([
      [43.886, 8.029],
      [43.846, 7.852],
      [43.817, 7.777],
    ]);
  });

  it('returns a ready map state when every segment stop has coordinates', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.mapStatus).toBe('ready');
    expect(state.hasMap).toBe(true);
    expect(state.points).toEqual([
      { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20', latitude: 43.886, longitude: 8.029 },
      { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45', latitude: 43.846, longitude: 7.852 },
      { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00', latitude: 43.817, longitude: 7.777 },
    ]);
    expect(state.missingStopIds).toEqual([]);
  });

  it('returns a partial map state when at least two stops have coordinates and some are missing', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.mapStatus).toBe('partial');
    expect(state.hasMap).toBe(true);
    expect(state.points.map((point) => point.stopId)).toEqual([
      'imperia-porto-maurizio',
      'sanremo-autostazione',
    ]);
    expect(state.missingStopIds).toEqual(['taggia-stazione']);
  });

  it('returns an unavailable map state when fewer than two stops have coordinates', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
    });

    expect(state.mapStatus).toBe('unavailable');
    expect(state.hasMap).toBe(false);
    expect(state.missingStopIds).toEqual(['taggia-stazione', 'sanremo-autostazione']);
    expect(state.stops).toHaveLength(3);
  });

  it('treats unusable coordinates as missing stops', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: Number.NaN, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    });

    expect(state.mapStatus).toBe('partial');
    expect(state.hasMap).toBe(true);
    expect(state.points.map((point) => point.stopId)).toEqual([
      'imperia-porto-maurizio',
      'sanremo-autostazione',
    ]);
    expect(state.missingStopIds).toEqual(['taggia-stazione']);
  });

  it('returns a load-failed map state when map rendering failed after coordinates were available', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
      'taggia-stazione': { latitude: 43.846, longitude: 7.852 },
      'sanremo-autostazione': { latitude: 43.817, longitude: 7.777 },
    }, {
      mapLoadFailed: true,
    });

    expect(state.mapStatus).toBe('load-failed');
    expect(state.hasMap).toBe(false);
    expect(state.points).toHaveLength(3);
  });

  it('returns unavailable when map loading failed but fewer than two stops have coordinates', () => {
    const state = buildRouteMapState(match, {
      'imperia-porto-maurizio': { latitude: 43.886, longitude: 8.029 },
    }, {
      mapLoadFailed: true,
    });

    expect(state.mapStatus).toBe('unavailable');
    expect(state.hasMap).toBe(false);
    expect(state.points).toHaveLength(1);
  });
});
