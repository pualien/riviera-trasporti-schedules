import { describe, expect, it } from 'vitest';
import { buildStopCoordinates } from '../../scripts/build-stop-coordinates.mjs';

describe('buildStopCoordinates', () => {
  const stops = [
    { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
    { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  ];

  it('keeps usable manual coordinates keyed by known stop id', () => {
    expect(
      buildStopCoordinates({
        stops,
        coordinateOverrides: [
          {
            stopId: 'imperia-porto-maurizio',
            latitude: 43.8783009,
            longitude: 8.0162007,
          },
        ],
      }),
    ).toEqual({
      'imperia-porto-maurizio': {
        latitude: 43.8783009,
        longitude: 8.0162007,
      },
    });
  });

  it('rejects coordinate overrides for unknown stops', () => {
    expect(() =>
      buildStopCoordinates({
        stops,
        coordinateOverrides: [
          {
            stopId: 'missing-stop',
            latitude: 43.8783009,
            longitude: 8.0162007,
          },
        ],
      }),
    ).toThrow('Unknown coordinate stop id');
  });

  it('rejects unusable coordinates', () => {
    expect(() =>
      buildStopCoordinates({
        stops,
        coordinateOverrides: [
          {
            stopId: 'sanremo-autostazione',
            latitude: 43.8181223,
            longitude: null,
          },
        ],
      }),
    ).toThrow('Invalid coordinates');
  });
});
