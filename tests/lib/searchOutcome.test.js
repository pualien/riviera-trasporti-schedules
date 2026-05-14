import { describe, expect, it } from 'vitest';
import { buildSearchOutcome } from '../../src/lib/searchOutcome.js';

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'Imperia Porto Maurizio' },
  { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'Imperia Porto Maurizio Piazza Dante' },
  { id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione' },
];

const localities = [
  {
    id: 'porto-maurizio',
    label: 'Porto Maurizio',
    aliases: ['Imperia Porto Maurizio'],
    stopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
  },
];

describe('buildSearchOutcome', () => {
  it('builds a decision-first summary when future departures remain', () => {
    const matches = [
      {
        lineId: '12',
        departureTime: '16:45',
        arrivalTime: '17:25',
        durationMinutes: 40,
        sourcePage: 23,
      },
      {
        lineId: '12',
        departureTime: '18:10',
        arrivalTime: '18:50',
        durationMinutes: 40,
        sourcePage: 23,
      },
    ];

    const outcome = buildSearchOutcome({
      matches,
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      localities,
      reachability: {},
      stops,
    });

    expect(outcome).toMatchObject({
      type: 'results',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '18:10',
        averageDurationMinutes: 40,
        lines: ['12'],
      },
    });
  });

  it('returns a no-direct fallback with alternate origin stop suggestions', () => {
    const outcome = buildSearchOutcome({
      matches: [],
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      fromStopId: 'imperia-porto-maurizio',
      localities,
      reachability: {
        'imperia-porto-maurizio': [],
        'imperia-porto-maurizio-piazza-dante': ['sanremo-autostazione'],
      },
      stops,
    });

    expect(outcome).toMatchObject({
      type: 'no-direct',
      suggestions: [
        {
          kind: 'origin-stop',
          stopId: 'imperia-porto-maurizio-piazza-dante',
          label: 'Imperia Porto Maurizio Piazza Dante',
          action: {
            type: 'set-origin-stop',
            stopId: 'imperia-porto-maurizio-piazza-dante',
          },
        },
      ],
    });
  });

  it('returns reachable destination suggestions for a broad locality no-direct search', () => {
    const outcome = buildSearchOutcome({
      matches: [],
      now: new Date('2026-05-04T16:10:00'),
      fromLocalityId: 'porto-maurizio',
      fromStopId: null,
      localities,
      reachability: {
        'imperia-porto-maurizio': ['sanremo-autostazione'],
      },
      stops,
    });

    expect(outcome.suggestions[0]).toMatchObject({
      kind: 'destination-stop',
      stopId: 'sanremo-autostazione',
      label: 'Sanremo Autostazione',
      action: {
        type: 'set-destination-stop',
        stopId: 'sanremo-autostazione',
      },
    });
  });
});
