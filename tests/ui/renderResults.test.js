import { describe, expect, it } from 'vitest';
import { renderResultsView } from '../../src/ui/renderResults.js';

describe('renderResultsView', () => {
  it('renders the route summary, next departures, and full timetable', () => {
    const html = renderResultsView({
      routeLabel: 'Porto Maurizio -> Sanremo',
      summary: {
        averageDurationMinutes: 39,
        firstDeparture: '06:20',
        lastDeparture: '19:45',
        lines: ['12'],
      },
      nextDepartures: [
        {
          departureTime: '16:45',
          arrivalTime: '17:25',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [
        {
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
    });

    expect(html).toContain('Next departures');
    expect(html).toContain('39 min');
    expect(html).toContain('Open PDF');
  });
});
