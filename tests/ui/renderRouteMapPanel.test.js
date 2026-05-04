import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderRouteMapPanel } from '../../src/ui/renderRouteMapPanel.js';

describe('renderRouteMapPanel', () => {
  it('renders the selected trip stop list and fallback message when map data is unavailable', () => {
    const html = renderRouteMapPanel({
      t: createTranslator('en'),
      match: {
        lineId: '12',
        direction: 'ANDORA - SANREMO',
        departureTime: '06:20',
        arrivalTime: '07:00',
      },
      mapState: {
        hasMap: false,
        stops: [
          { stopId: 'imperia-porto-maurizio', label: 'imperia porto maurizio', time: '06:20' },
          { stopId: 'taggia-stazione', label: 'taggia stazione', time: '06:45' },
          { stopId: 'sanremo-autostazione', label: 'sanremo autostazione', time: '07:00' },
        ],
      },
    });

    expect(html).toContain('Selected trip map');
    expect(html).toContain('Map unavailable for this trip');
    expect(html).toContain('taggia stazione');
  });
});
