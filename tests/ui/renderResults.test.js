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

  it('renders taxi route options with destination coverage labels', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Diano Marina -> Sanremo',
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
          serviceId: 'mauro-taxi-diano-marina',
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Mauro Taxi Diano Marina',
          phone: '+39 347 0439704',
          phones: [{ label: '+39 347 0439704', href: 'tel:+393470439704' }],
          sourceUrl: 'https://maurotaxi.it/it/',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Diano Marina'],
        },
        {
          serviceId: 'radio-taxi-sanremo',
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Radio Taxi Sanremo',
          phone: '+39 0184 541454',
          phones: [{ label: '+39 0184 541454', href: 'tel:+390184541454' }],
          sourceUrl: 'https://radiotaxisanremo.com/',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
        },
      ],
    });

    expect(html).toContain('Taxi numbers for this route');
    expect(html).toContain('Mauro Taxi Diano Marina');
    expect(html).toContain('Diano Marina');
    expect(html).toContain('Radio Taxi Sanremo');
    expect(html).toContain('Arma di Taggia');
    expect(html).toContain('tel:+393470439704');
    expect(html).toContain('tel:+390184541454');
  });
});
