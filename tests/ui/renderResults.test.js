import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderResultsView } from '../../src/ui/renderResults.js';

describe('renderResultsView', () => {
  it('renders the route summary, next departures, and full timetable', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
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

  it('renders translated results copy without changing line data', () => {
    const html = renderResultsView({
      t: createTranslator('es'),
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
      allDepartures: [],
    });

    expect(html).toContain('Proximas salidas');
    expect(html).toContain('Linea 12');
    expect(html).toContain('Abrir PDF');
  });

  it('renders selectable departure cards and the selected trip panel', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      summary: {
        averageDurationMinutes: 39,
        firstDeparture: '06:20',
        lastDeparture: '19:45',
        lines: ['12'],
      },
      nextDepartures: [],
      allDepartures: [
        {
          tripKey: '12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione',
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      selectedTripKey: '12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione',
      selectedTripPanel: '<section data-testid="route-map-panel">panel</section>',
    });

    expect(html).toContain('data-trip-key="12:feriale:23:0:imperia-porto-maurizio:sanremo-autostazione"');
    expect(html).toContain('departure-card departure-card--selected');
    expect(html).toContain('data-testid="route-map-panel"');
  });
});
