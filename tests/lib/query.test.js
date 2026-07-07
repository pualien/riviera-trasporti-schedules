import { describe, expect, it } from 'vitest';
import { buildRouteSummary, findDirectTrips, resolveRouteStopIds } from '../../src/lib/query.js';

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

  it('includes daily service when searching weekday departures', () => {
    const matches = findDirectTrips({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      dayType: 'feriale',
      aliases,
      trips: [
        {
          lineId: '12',
          dayType: 'feriale',
          sourcePage: 22,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '14:15' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '15:00' },
          ],
        },
        {
          lineId: '12',
          dayType: 'giornaliero',
          sourcePage: 22,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '22:15' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '22:55' },
          ],
        },
      ],
    });

    expect(matches.map((match) => match.departureTime)).toEqual(['14:15', '22:15']);
  });

  it('includes weekday, school-only, and daily service when searching school-day departures', () => {
    const matches = findDirectTrips({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      dayType: 'scolastico',
      aliases,
      trips: [
        {
          lineId: '12',
          dayType: 'feriale',
          sourcePage: null,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '07:10' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '07:50' },
          ],
        },
        {
          lineId: '19',
          dayType: 'scolastico',
          sourcePage: null,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '07:35' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '08:20' },
          ],
        },
        {
          lineId: '12',
          dayType: 'giornaliero',
          sourcePage: null,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '08:05' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '08:45' },
          ],
        },
        {
          lineId: '1',
          dayType: 'festivo',
          sourcePage: null,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '09:00' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '09:40' },
          ],
        },
      ],
    });

    expect(matches.map((match) => match.departureTime)).toEqual(['07:10', '07:35', '08:05']);
  });

  it('deduplicates duplicate visible rides from overlapping service calendars', () => {
    const matches = findDirectTrips({
      fromStopId: 'imperia-porto-maurizio',
      toStopId: 'sanremo-autostazione',
      dayType: 'feriale',
      aliases,
      trips: [
        {
          lineId: '12',
          dayType: 'feriale',
          sourcePage: 22,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '14:15' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '15:00' },
          ],
        },
        {
          lineId: '12',
          dayType: 'giornaliero',
          sourcePage: 23,
          stops: [
            { stopId: 'imperia-porto-maurizio', name: 'imperia porto maurizio', time: '14:15' },
            { stopId: 'sanremo-autostazione', name: 'sanremo autostazione', time: '15:00' },
          ],
        },
      ],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      lineId: '12',
      departureTime: '14:15',
      arrivalTime: '15:00',
    });
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

  it('uses a repeated destination stop only when it occurs after the selected origin', () => {
    const matches = findDirectTrips({
      from: 'Airole',
      fromLocalityStopIds: ['airole-bivio'],
      to: 'Trucco',
      toStopId: 'trucco',
      dayType: 'feriale',
      aliases,
      trips: [
        {
          lineId: '3',
          dayType: 'feriale',
          sourcePage: 30,
          stops: [
            { stopId: 'trucco', name: 'trucco', time: '08:35' },
            { stopId: 'airole-bivio', name: 'airole bivio', time: '08:40' },
            { stopId: 'airole-piazza', name: 'airole piazza', time: '08:43' },
            { stopId: 'trucco', name: 'trucco', time: '09:20' },
          ],
        },
      ],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      fromIndex: 1,
      toIndex: 3,
      departureTime: '08:40',
      arrivalTime: '09:20',
    });
  });
});

describe('resolveRouteStopIds', () => {
  it('resolves typed origin and destination labels through the same aliases direct search uses', () => {
    expect(resolveRouteStopIds({
      from: 'Porto Maurizio',
      to: 'Sanremo',
      aliases,
    })).toEqual({
      originStopIds: ['imperia-porto-maurizio'],
      destinationStopId: 'sanremo-autostazione',
    });
  });

  it('preserves selected exact ids and locality stop ids over labels', () => {
    expect(resolveRouteStopIds({
      from: 'Ignored label',
      to: 'Ignored destination',
      fromStopId: 'selected-origin',
      fromLocalityStopIds: ['locality-origin'],
      toStopId: 'selected-destination',
      aliases,
    })).toEqual({
      originStopIds: ['selected-origin'],
      destinationStopId: 'selected-destination',
    });

    expect(resolveRouteStopIds({
      from: 'Ignored label',
      to: 'Sanremo',
      fromLocalityStopIds: ['locality-origin-a', 'locality-origin-b'],
      aliases,
    })).toMatchObject({
      originStopIds: ['locality-origin-a', 'locality-origin-b'],
    });
  });
});
