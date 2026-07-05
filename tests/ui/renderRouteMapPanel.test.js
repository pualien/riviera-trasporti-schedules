import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderRouteMapPanel } from '../../src/ui/renderRouteMapPanel.js';

const match = {
  lineId: '12',
  direction: 'ANDORA - SANREMO',
  departureTime: '06:20',
  arrivalTime: '07:00',
  durationMinutes: 40,
  sourcePage: 23,
};

const stops = [
  { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20' },
  { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45' },
  { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00' },
];

describe('renderRouteMapPanel', () => {
  it('renders selected trip details with ready map container and official PDF action', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      pdfUrl: 'https://example.com/riviera.pdf',
      mapState: {
        hasMap: true,
        mapStatus: 'ready',
        stops,
        points: [],
        missingStopIds: [],
      },
    });

    expect(html).toContain('Selected trip details');
    expect(html).toContain('Line 12');
    expect(html).toContain('06:20');
    expect(html).toContain('07:00');
    expect(html).toContain('40 min');
    expect(html).toContain('https://example.com/riviera.pdf#page=23');
    expect(html).toContain('data-map-status="ready"');
    expect(html).toContain('Street-following estimate through mapped stops; always confirm with the official PDF.');
    expect(html).not.toContain('Map coordinates are not yet available');
  });

  it('renders partial coordinate copy while preserving the stop sequence', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: true,
        mapStatus: 'partial',
        stops,
        points: [],
        missingStopIds: ['taggia-stazione'],
      },
    });

    expect(html).toContain('Some stops are listed below without map coordinates.');
    expect(html).toContain('06:45 · taggia stazione');
    expect(html).toContain('data-map-status="partial"');
  });

  it('renders unavailable coordinate copy without hiding the trip details', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: false,
        mapStatus: 'unavailable',
        stops,
        points: [],
        missingStopIds: stops.map((stop) => stop.stopId),
      },
    });

    expect(html).toContain('Map coordinates are not yet available for this trip.');
    expect(html).toContain('Selected trip details');
    expect(html).toContain('06:20 · imperia porto maurizio');
  });

  it('renders map load failure copy', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match,
      mapState: {
        hasMap: false,
        mapStatus: 'load-failed',
        stops,
        points: [],
        missingStopIds: [],
      },
    });

    expect(html).toContain('The map could not load.');
    expect(html).toContain('Use the stop list and official PDF to confirm this trip.');
  });
});
