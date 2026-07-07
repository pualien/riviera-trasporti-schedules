import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderResultsView } from '../../src/ui/renderResults.js';

function getTaxiPanel(html) {
  return html.match(/<div class="taxi-panel">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? '';
}

const countOccurrences = (html, needle) => html.split(needle).length - 1;

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
    expect(html).toContain('data-save-current-route');
    expect(html).toContain('data-share-current-route');
    expect(html).toContain('class="summary-card" data-result-anchor');
    expect(html).toContain('Save route');
    expect(html).toContain('Share');
  });

  it('renders Italian results copy without changing line data', () => {
    const html = renderResultsView({
      t: createTranslator('it'),
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

    expect(html).toContain('Prossime 3 partenze da adesso');
    expect(html).toContain('Linea 12');
    expect(html).toContain('Apri PDF');
  });

  it('uses a sane fallback PDF link when the runtime PDF URL is missing', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: '#',
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

    expect(html).not.toContain('##page=23');
    expect(html).toContain('href="#"');
  });

  it('renders GTFS source copy and feed-only labels when PDF page is unavailable', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/orario.pdf',
      sourceInfo: { type: 'gtfs' },
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
          sourcePage: null,
        },
      ],
      allDepartures: [],
    });

    expect(html).toContain('Times generated from Regione Liguria GTFS planned-service data');
    expect(html).toContain('Feed source only');
    expect(html).not.toContain('Open PDF');
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
    expect(html).toContain('Selected');
    expect(html).toContain('data-testid="route-map-panel"');
  });

  it('keeps the full timetable collapsed and compact after prominent next departures', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '23:10',
        averageDurationMinutes: 39,
        lines: ['12'],
      },
      nextDepartures: [
        {
          tripKey: 'next-trip',
          departureTime: '16:45',
          arrivalTime: '17:25',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [
        {
          tripKey: 'morning-trip',
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
        {
          tripKey: 'afternoon-trip',
          departureTime: '14:05',
          arrivalTime: '14:46',
          durationMinutes: 41,
          lineId: '12',
          sourcePage: 24,
        },
        {
          tripKey: 'evening-trip',
          departureTime: '19:20',
          arrivalTime: '20:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 25,
        },
      ],
    });

    expect(html.indexOf('Next 3 departures from now')).toBeLessThan(html.indexOf('class="departure-archive"'));
    expect(html).toContain('<details class="departure-archive">');
    expect(html).toContain('All departures (3)');
    expect(html).toContain('Morning');
    expect(html).toContain('Afternoon');
    expect(html).toContain('Evening');
    expect(countOccurrences(html, 'data-share-departure=')).toBe(1);
    expect(countOccurrences(html, 'Open PDF')).toBe(1);
    expect(html).toContain('data-select-departure="morning-trip"');
  });

  it('renders the next three departures from now as the hero answer with countdowns and line badges', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      summary: {
        serviceEnded: false,
        nextDeparture: { departureTime: '16:45' },
        soonestArrival: { arrivalTime: '17:25' },
        lastDepartureTime: '23:10',
        averageDurationMinutes: 39,
        lines: ['12', '13'],
      },
      nextDepartures: [
        {
          tripKey: 'next-trip',
          departureTime: '16:45',
          arrivalTime: '17:25',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: null,
          minutesUntilDeparture: 35,
        },
        {
          tripKey: 'second-trip',
          departureTime: '17:10',
          arrivalTime: '17:52',
          durationMinutes: 42,
          lineId: '13',
          sourcePage: null,
          minutesUntilDeparture: 60,
        },
      ],
      allDepartures: [],
      sourceInfo: { type: 'gtfs' },
    });

    expect(html).toContain('class="next-answer-card"');
    expect(html).toContain('Next 3 departures from now');
    expect(html).toContain('Leaves in 35 min');
    expect(html).toContain('Line 12');
    expect(html).toContain('class="line-badge"');
    expect(html).toContain('40 min');
    expect(html.indexOf('class="next-answer-card"')).toBeLessThan(html.indexOf('class="metrics"'));
    expect(html).not.toContain('PDF page null');
  });

  it('labels selected and unselected departure detail actions clearly', () => {
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
      nextDepartures: [
        {
          tripKey: 'selected-trip',
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
        {
          tripKey: 'other-trip',
          departureTime: '07:05',
          arrivalTime: '07:46',
          durationMinutes: 41,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [],
      selectedTripKey: 'selected-trip',
      selectedTripPanel: '<section data-testid="route-map-panel">panel</section>',
    });

    expect(html).toContain('departure-card departure-card--selected');
    expect(html).toContain('Selected');
    expect(html).toContain('Details');
    expect(html).toContain('data-testid="route-map-panel"');
  });

  it('renders departure detail actions as named buttons', () => {
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
      nextDepartures: [
        {
          tripKey: 'keyboard-trip',
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [],
    });

    expect(html).toContain('type="button" class="departure-detail-action"');
    expect(html).toContain('data-select-departure="keyboard-trip"');
    expect(html).toContain('aria-label="Details: 06:20 arrives 07:00 · Line 12"');
  });

  it('share diffusion UI', () => {
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
      nextDepartures: [
        {
          tripKey: 'selected-trip',
          departureTime: '06:20',
          arrivalTime: '07:00',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [],
    });

    expect(html).toContain('data-share-departure="selected-trip"');
    expect(html).toContain('Share departure');
  });

  it('renders shared route context controls when a shared departure is restored', () => {
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
      allDepartures: [],
      sharedRouteContext: {
        visible: true,
        selectedDepartureRestored: true,
      },
    });

    expect(html).toContain('class="shared-route-context"');
    expect(html).toContain('Shared route');
    expect(html).toContain('data-save-current-route');
    expect(html).toContain('data-reverse-shared-route');
    expect(html).toContain('data-share-current-route');
    expect(html).toContain('Save');
    expect(html).toContain('Reverse');
    expect(html).toContain('Share again');
  });

  it('renders a distinct note when a shared departure no longer resolves', () => {
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
      allDepartures: [],
      sharedRouteContext: {
        visible: true,
        shareScope: 'departure',
        tripKey: 'stale-trip',
        selectedDepartureRestored: false,
      },
    });

    expect(html).toContain('class="shared-route-context"');
    expect(html).toContain('The shared departure is no longer available in this timetable.');
    expect(html).not.toContain('The shared route reopened with the current timetable.');
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
          bookingUrl: 'https://radiotaxisanremo.com/book',
          sourceUrl: 'https://radiotaxisanremo.com/',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
        },
      ],
    });

    const taxiPanel = getTaxiPanel(html);
    const summaryEndIndex = html.indexOf('</article>');

    expect(html).toContain('Taxi numbers for this route');
    expect(html).toContain('<details class="secondary-route-options">');
    expect(html.indexOf('<details class="secondary-route-options">')).toBeGreaterThan(html.indexOf('Next departures'));
    expect(html.slice(0, summaryEndIndex)).not.toContain('Taxi numbers for this route');
    expect(html).toContain('Mauro Taxi Diano Marina');
    expect(html).toContain('Diano Marina');
    expect(html).toContain('Radio Taxi Sanremo');
    expect(html).toContain('Arma di Taggia');
    expect(html).toContain('tel:+393470439704');
    expect(html).toContain('tel:+390184541454');
    expect(countOccurrences(html, '<div class="taxi-panel">')).toBe(1);
    expect(countOccurrences(taxiPanel, '<article class="taxi-panel-entry">')).toBe(2);
    expect(taxiPanel).toContain('<h4>Mauro Taxi Diano Marina</h4>');
    expect(taxiPanel).toContain('<h4>Radio Taxi Sanremo</h4>');
    expect(taxiPanel).toContain('If you need a fallback in Provincia di Imperia, you can call a verified taxi contact.');
    expect(taxiPanel).toContain('href="https://maurotaxi.it/it/"');
    expect(taxiPanel).toContain('href="https://radiotaxisanremo.com/"');
    expect(taxiPanel).toContain('Verified 2026-05-13');
    expect(taxiPanel).toContain('href="https://radiotaxisanremo.com/book"');
    expect(taxiPanel).toContain('Book online');
    expect(html).not.toContain('class="taxi-option-card"');
  });

  it('renders save feedback in an aria-live route action status', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Imperia -> Sanremo',
      summary: {
        serviceEnded: false,
        nextDeparture: null,
        soonestArrival: null,
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
        lines: ['12'],
      },
      nextDepartures: [],
      allDepartures: [],
      routeActions: {
        saveFeedback: { status: 'saved' },
        shareModal: null,
      },
    });

    expect(html).toContain('class="route-action-feedback"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Route saved');
  });

  it('renders share modal with tracked direct link and social options', () => {
    const html = renderResultsView({
      t: createTranslator('en'),
      routeLabel: 'Imperia -> Sanremo',
      summary: {
        serviceEnded: false,
        nextDeparture: null,
        soonestArrival: null,
        lastDepartureTime: '19:45',
        averageDurationMinutes: 39,
        lines: ['12'],
      },
      nextDepartures: [],
      allDepartures: [],
      routeActions: {
        saveFeedback: null,
        shareModal: {
          baseUrl: 'https://riviera-dei-fiori-route-finder.example/app?tab=search&from=Imperia&to=Sanremo&day=feriale',
          status: 'copied',
          text: 'Riviera Dei Fiori Route Finder: Imperia -> Sanremo, linea 12, parte 08:30.',
        },
      },
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-share-modal');
    expect(html).toContain('share-option-logo');
    expect(html).toContain('utm_source=share_link');
    expect(html).toContain('data-share-option="whatsapp"');
    expect(html).toContain('share-option--whatsapp');
    expect(html).toContain('utm_source=share_whatsapp');
    expect(html).toContain('data-share-option="telegram"');
    expect(html).toContain('share-option--telegram');
    expect(html).toContain('data-share-option="facebook"');
    expect(html).toContain('share-option--facebook');
    expect(html).toContain('data-share-option="x"');
    expect(html).toContain('share-option--x');
    expect(html).toContain('Link copied');
    expect(html).toContain(encodeURIComponent('Riviera Dei Fiori Route Finder: Imperia -> Sanremo, linea 12, parte 08:30.'));
  });
});
