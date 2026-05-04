import { describe, expect, it } from 'vitest';
import { renderLocationPicker } from '../../src/ui/renderLocationPicker.js';

describe('renderLocationPicker', () => {
  it('explains that GPS may still require exact stop confirmation inside a locality', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      nearbyStops: [
        {
          stopId: 'imperia-porto-maurizio',
          canonical: 'imperia porto maurizio',
          localityLabel: 'Porto Maurizio',
          distanceMeters: 180,
        },
      ],
    });

    expect(html).toContain('Choose area, then exact stop');
    expect(html).toContain('Porto Maurizio');
  });
});
