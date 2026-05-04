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
  {
    lineId: '13',
    dayType: 'feriale',
    sourcePage: 24,
    stops: [
      { stopId: 'imperia-porto-maurizio-piazza-dante', name: 'imperia porto maurizio piazza dante', time: '06:15' },
      { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:05' },
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

  it('searches across every stop in the selected locality when no exact origin stop exists', () => {
    const matches = findDirectTrips({
      from: 'Porto Maurizio',
      fromLocalityStopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
      toStopId: 'sanremo-autostazione',
      dayType: 'feriale',
      aliases,
      trips,
    });

    expect(matches).toHaveLength(3);
    expect(matches.map((match) => match.fromStopId)).toEqual([
      'imperia-porto-maurizio-piazza-dante',
      'imperia-porto-maurizio',
      'imperia-porto-maurizio',
    ]);
  });

  it('returns stable trip metadata and the matched stop segment for each direct trip', () => {
    const matches = findDirectTrips({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      dayType: 'feriale',
      aliases,
      trips: [
        {
          lineId: '12',
          direction: 'ANDORA - SANREMO',
          dayType: 'feriale',
          sourcePage: 22,
          stops: [
            { stopId: 'andora-stazione-fs', name: 'andora stazione fs', time: '05:35' },
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '06:20' },
            { stopId: 'taggia-stazione', name: 'taggia stazione', time: '06:45' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:00' },
          ],
        },
      ],
    });

    expect(matches[0]).toMatchObject({
      tripKey: '12:feriale:22:0:imperia-porto-maurizio:sanremo-autostazione',
      direction: 'ANDORA - SANREMO',
      fromIndex: 1,
      toIndex: 3,
    });
    expect(matches[0].segmentStops.map((stop) => stop.stopId)).toEqual([
      'imperia-porto-maurizio',
      'taggia-stazione',
      'sanremo-autostazione',
    ]);
  });
});
