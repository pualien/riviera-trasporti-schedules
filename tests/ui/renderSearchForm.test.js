import { describe, expect, it } from 'vitest';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders a blank initial form with a focusable but informational to field', () => {
    const html = renderSearchForm({
      fromInput: '',
      fromLocalitySelected: false,
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

    expect(html).toContain('Ricerca Percorsi / Route Lookup');
    expect(html).toContain('Find direct Riviera buses faster than scanning the PDF.');
    expect(html).not.toContain('Riviera Trasporti Search');
    expect(html).toContain('placeholder="Porto Maurizio"');
    expect(html).toContain('name="from"');
    expect(html).toContain('data-panel="from"');
    expect(html).toContain('data-from-value="Porto Maurizio"');
    expect(html).toContain('data-from-value="Sanremo"');
    expect(html).toContain('name="to"');
    expect(html).toContain('data-panel="to"');
    expect(html).not.toContain('disabled');
    expect(html).toContain('Choose a departure area first to see direct destinations.');
    expect(html).toContain('Waiting for area');
    expect(html).toContain('Choose departure area');
    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
  });

  it('renders exact destinations once an origin area has been selected', () => {
    const html = renderSearchForm({
      fromInput: 'Porto Maurizio',
      fromLocalitySelected: true,
      fromPanelOpen: false,
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'locality-destinations',
      destinationMessage: 'Direct destinations from this area',
      selectedLocalityLabel: 'Porto Maurizio',
      reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    });

    expect(html).toContain('Direct destinations from this area');
    expect(html).toContain('data-stop-id="sanremo-autostazione"');
    expect(html).toContain('Direct destination');
    expect(html).toContain('Choose');
    expect(html).toContain('Departure area');
    expect(html).toContain('1 direct option');
    expect(html).toContain('Porto Maurizio');
  });

  it('shows the exact stop name with no remaining broad-area helper after refinement', () => {
    const html = renderSearchForm({
      fromInput: 'imperia porto maurizio',
      fromLocalitySelected: true,
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
    expect(html).toContain('Exact departure stop selected for direct-service matching.');
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

  it('renders the day type control and submit action with dedicated classes', () => {
    const html = renderSearchForm();

    expect(html).toContain('class="field-select"');
    expect(html).toContain('class="search-form-submit"');
  });

  it('renders the guided route progress states', () => {
    const html = renderSearchForm({
      fromLocalitySelected: true,
      exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      toStopSelected: false,
    });

    expect(html).toContain('Route picker steps');
    expect(html).toContain('route-progress-step--done');
    expect(html).toContain('Direct-match stop locked');
    expect(html).toContain('Choose direct destination');
  });
});
