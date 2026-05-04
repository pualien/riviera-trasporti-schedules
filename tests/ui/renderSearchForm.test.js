import { describe, expect, it } from 'vitest';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders a blank initial form with a focusable but informational to field', () => {
    const html = renderSearchForm({
      fromInput: '',
      fromPanelOpen: true,
      fromSuggestions: [
        { value: 'Porto Maurizio', meta: 'Area' },
        { value: 'Sanremo', meta: 'Area' },
      ],
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'informational',
      destinationMessage: 'Choose a departure area first to see direct destinations.',
      reachableDestinations: [],
    });

    expect(html).toContain('Find direct Riviera buses faster than scanning the PDF');
    expect(html).toContain('placeholder="Porto Maurizio"');
    expect(html).toContain('name="from"');
    expect(html).toContain('data-panel="from"');
    expect(html).toContain('data-from-value="Porto Maurizio"');
    expect(html).toContain('data-from-value="Sanremo"');
    expect(html).toContain('name="to"');
    expect(html).toContain('data-panel="to"');
    expect(html).not.toContain('disabled');
    expect(html).toContain('Choose a departure area first to see direct destinations.');
    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
  });

  it('renders exact destinations once an origin area has been selected', () => {
    const html = renderSearchForm({
      fromInput: 'Porto Maurizio',
      fromPanelOpen: false,
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'locality-destinations',
      destinationMessage: 'Direct destinations from this area',
      reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    });

    expect(html).toContain('Direct destinations from this area');
    expect(html).toContain('data-stop-id="sanremo-autostazione"');
  });

  it('shows the exact stop name with no remaining broad-area helper after refinement', () => {
    const html = renderSearchForm({
      fromInput: 'imperia porto maurizio',
      exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      fromPanelOpen: false,
      toInput: '',
      toPanelOpen: false,
      destinationMode: 'exact-stop-destinations',
      destinationMessage: 'Direct destinations from this stop',
      reachableDestinations: [],
    });

    expect(html).toContain('value="imperia porto maurizio"');
    expect(html).not.toContain('Exact stop confirmed in Porto Maurizio');
  });

  it('shows an informational to panel without disabling the field before origin selection', () => {
    const html = renderSearchForm({
      fromInput: '',
      fromPanelOpen: false,
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'informational',
      destinationMessage: 'Choose a departure area first to see direct destinations.',
      reachableDestinations: [],
    });

    expect(html).toContain('data-panel="to"');
    expect(html).not.toContain('name="to"\n              disabled');
  });
});
