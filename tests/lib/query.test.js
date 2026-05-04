import { describe, expect, it } from 'vitest';
import { buildRouteSummary, findDirectTrips } from '../../src/lib/query.js';

const aliases = {
  'imperia porto maurizio': ['porto maurizio'],
  'sanremo autostazione': ['sanremo'],
};

const trips = [
  {
    lineId: '12',
    dayType: 'feriale',
    sourcePage: 22,
    stops: [
      { stopId: 'andora-stazione-fs', name: 'andora stazione fs', time: '05:35' },
      { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
      { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
    ],
  },
  {
    lineId: '12',
    dayType: 'feriale',
    sourcePage: 22,
    stops: [
      { stopId: 'andora-stazione-fs', name: 'andora stazione fs', time: '05:55' },
      { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:40' },
      { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:20' },
    ],
  },
];

describe('findDirectTrips', () => {
  it('finds direct trips and computes summary metrics', () => {
    const matches = findDirectTrips({
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'feriale',
      aliases,
      trips,
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      departureTime: '06:20',
      arrivalTime: '07:00',
      durationMinutes: 40,
    });

    expect(buildRouteSummary(matches)).toMatchObject({
      averageDurationMinutes: 40,
      firstDeparture: '06:20',
      lastDeparture: '06:40',
      lines: ['12'],
    });
  });

  it('accepts exact stop ids when submitting a route search', () => {
    const matches = findDirectTrips({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      dayType: 'feriale',
      aliases,
      trips,
    });

    expect(matches).toHaveLength(2);
    expect(matches[0].fromStopId).toBe('imperia-porto-maurizio');
    expect(matches[0].toStopId).toBe('sanremo-autostazione');
  });
});
