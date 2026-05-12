import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderResultsView } from '../../src/ui/renderResults.js';

describe('renderResultsView', () => {
  it('renders decision-first summary metrics and uses the runtime PDF URL', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
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

    expect(html).toContain('Next departure');
    expect(html).toContain('Soonest arrival');
    expect(html).toContain('Last departure today');
    expect(html).toContain('Average duration');
    expect(html).toContain('https://example.com/riviera.pdf#page=23');
  });

  it('renders translated results copy without changing line data', () => {
    const html = renderResultsView({
      t: createTranslator('es'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
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
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: null,
        soonestArrival: null,
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
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
    expect(html).toContain('Show trip on map');
    expect(html).toContain('data-testid="route-map-panel"');
  });

  it('renders taxi route options when curated coverage exists on both endpoints', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
        lines: ['12'],
      },
      nextDepartures: [],
      allDepartures: [],
      taxiOptions: [
        {
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Taxi Imperia',
          phone: '+39 0183 3785',
          phones: [{ label: '+39 0183 3785', href: 'tel:+3901833785' }],
          sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
          verifiedAt: '2026-05-12',
        },
        {
          provinceId: 'savona',
          provinceLabel: 'Provincia di Savona',
          serviceLabel: 'Radio Taxi Albenga',
          phone: '+39 328 7254729',
          phones: [
            { label: '+39 328 7254729', href: 'tel:+393287254729' },
            { label: '+39 0182 0303', href: 'tel:+3901820303' },
          ],
          sourceUrl: 'https://www.radiotaxialbenga.it/',
          verifiedAt: '2026-05-12',
        },
      ],
    });

    expect(html).toContain('Taxi numbers for this route');
    expect(html).toContain('Taxi Imperia');
    expect(html).toContain('Radio Taxi Albenga');
    expect(html).toContain('tel:+3901833785');
    expect(html).toContain('tel:+3901820303');
  });
});
