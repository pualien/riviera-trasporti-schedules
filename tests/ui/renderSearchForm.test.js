import { describe, expect, it } from 'vitest';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders Riviera Trasporti-wide copy and a disabled to picker before exact origin selection', () => {
    const html = renderSearchForm({
      fromInput: 'Porto Maurizio',
      fromLocalityLabel: 'Porto Maurizio',
      exactFromStop: null,
      toInput: '',
      reachableDestinations: [],
    });

    expect(html).toContain('Search Riviera Trasporti faster than reading the full PDF');
    expect(html).toContain('Choose area, then exact stop');
    expect(html).toContain('name="to"');
    expect(html).toContain('disabled');
    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
  });

  it('renders direct destinations after an exact origin stop exists', () => {
    const html = renderSearchForm({
      fromInput: 'Porto Maurizio',
      fromLocalityLabel: 'Porto Maurizio',
      exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      toInput: 'Sanremo',
      reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    });

    expect(html).toContain('sanremo-autostazione');
    expect(html).not.toContain('disabled');
  });
});
