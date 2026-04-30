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
      { name: 'andora stazione fs', time: '05:35' },
      { name: 'imperia porto maurizio', time: '06:20' },
      { name: 'sanremo autostazione', time: '07:00' },
    ],
  },
  {
    lineId: '12',
    dayType: 'feriale',
    sourcePage: 22,
    stops: [
      { name: 'andora stazione fs', time: '05:55' },
      { name: 'imperia porto maurizio', time: '06:40' },
      { name: 'sanremo autostazione', time: '07:20' },
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
});
