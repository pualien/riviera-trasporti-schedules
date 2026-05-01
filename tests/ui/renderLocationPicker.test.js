import { describe, expect, it } from 'vitest';
import { renderLocationPicker } from '../../src/ui/renderLocationPicker.js';

describe('renderLocationPicker', () => {
  it('renders a compact map region and nearby choices', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      nearbyStops: [
        { stopId: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', distanceMeters: 180 },
      ],
    });

    expect(html).toContain('Nearest stops');
    expect(html).toContain('imperia porto maurizio');
    expect(html).toContain('data-stop-id="imperia-porto-maurizio"');
  });
});
