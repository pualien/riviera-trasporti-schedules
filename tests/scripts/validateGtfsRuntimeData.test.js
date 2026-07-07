import { describe, expect, it } from 'vitest';
import { validateGtfsRuntimeData } from '../../scripts/lib/gtfs/validateGtfsRuntimeData.mjs';

const baseRuntimeData = {
  lines: [{ lineId: '12', pages: [] }],
  stops: [{ id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione', variants: [] }],
  trips: [
    {
      lineId: '12',
      dayType: 'feriale',
      sourcePage: null,
      stops: [
        { stopId: 'imperia-porto-maurizio', name: 'Imperia Porto Maurizio', time: '06:20' },
        { stopId: 'sanremo-autostazione', name: 'Sanremo Autostazione', time: '07:00' },
      ],
    },
  ],
  localities: [{ id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo-autostazione'] }],
  reachability: { 'imperia-porto-maurizio': ['sanremo-autostazione'] },
  metadata: {
    source: {
      type: 'gtfs',
      validFrom: '2026-06-14',
      validUntil: '2026-12-12',
    },
    builtAt: '2026-07-06T08:00:00.000Z',
  },
};

describe('validateGtfsRuntimeData', () => {
  it('marks usable future-valid data as fresh', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: baseRuntimeData,
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('fresh');
    expect(report.errors).toEqual([]);
    expect(report.counts).toMatchObject({
      lines: 1,
      stops: 1,
      trips: 1,
      directPairs: 1,
    });
  });

  it('fails expired feed data', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        metadata: {
          ...baseRuntimeData.metadata,
          source: {
            ...baseRuntimeData.metadata.source,
            validUntil: '2026-01-31',
          },
        },
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('failed');
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'SOURCE_EXPIRED' }));
  });

  it('warns when feed validity ends soon', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        metadata: {
          ...baseRuntimeData.metadata,
          source: {
            ...baseRuntimeData.metadata.source,
            validUntil: '2026-07-20',
          },
        },
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('warning');
    expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'SOURCE_ENDS_SOON' }));
  });

  it('fails empty runtime data', () => {
    const report = validateGtfsRuntimeData({
      runtimeData: {
        ...baseRuntimeData,
        lines: [],
        stops: [],
        trips: [],
        reachability: {},
      },
      now: new Date('2026-07-06T08:00:00.000Z'),
    });

    expect(report.status).toBe('failed');
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'NO_LINES',
      'NO_STOPS',
      'NO_TRIPS',
      'NO_DIRECT_PAIRS',
    ]));
  });
});
