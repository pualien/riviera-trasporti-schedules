import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders From choices as exact stops with the zone after the stop label', () => {
    const html = renderSearchForm({
      fromPanelOpen: true,
      fromSuggestions: {
        areas: [],
        exactStops: [
          {
            value: 'imperia porto maurizio',
            label: 'imperia porto maurizio (Porto Maurizio)',
            meta: 'Stop',
            type: 'exact-stop',
          },
        ],
        exactStopHeading: '',
      },
    });

    expect(html).toContain('data-from-value="imperia porto maurizio"');
    expect(html).toContain('imperia porto maurizio (Porto Maurizio)');
    expect(html).toContain('Stop');
    expect(html).not.toContain('data-option-type="area"');
    expect(html).not.toContain('Browse all departure areas');
  });

  it('renders To choices as exact stops with zone context', () => {
    const html = renderSearchForm({
      fromInput: 'imperia porto maurizio',
      fromLocalitySelected: true,
      exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      toPanelOpen: true,
      destinationMode: 'exact-stop-destinations',
      destinationMessage: 'Direct destinations from this stop',
      reachableDestinations: [
        {
          id: 'sanremo-autostazione',
          canonical: 'sanremo autostazione',
          displayLabel: 'sanremo autostazione (Sanremo)',
        },
      ],
    });

    expect(html).toContain('data-to-value="sanremo autostazione"');
    expect(html).toContain('sanremo autostazione (Sanremo)');
    expect(html).toContain('Stop');
  });

  it('renders a blank initial form with a focusable but informational to field', () => {
    const html = renderSearchForm({
      fromInput: '',
      fromLocalitySelected: false,
      fromPanelOpen: true,
      fromSuggestions: {
        areas: [],
        exactStops: [
          {
            value: 'imperia porto maurizio',
            label: 'imperia porto maurizio (Porto Maurizio)',
            meta: 'Stop',
            type: 'exact-stop',
          },
        ],
        exactStopHeading: '',
      },
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'informational',
      destinationMessage: 'Choose a departure stop first to see direct destinations.',
      reachableDestinations: [],
    });

    expect(html).toContain('Riviera Dei Fiori Route Finder');
    expect(html).toContain('Find direct Riviera Trasporti buses across the Riviera dei Fiori with Riviera Dei Fiori Route Finder.');
    expect(html).not.toContain('Riviera Trasporti Search');
    expect(html).toContain('placeholder="Choose departure stop"');
    expect(html).toContain('name="from"');
    expect(html).toContain('data-panel="from"');
    expect(html).toContain('data-from-value="imperia porto maurizio"');
    expect(html).toContain('name="to"');
    expect(html).toContain('data-panel="to"');
    expect(html).not.toContain('disabled');
    expect(html).toContain('Choose a departure stop first to see direct destinations.');
    expect(html).toContain('Waiting for stop');
    expect(html).toContain('Choose departure stop');
    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
  });

  it('renders a single exact-stop from panel', () => {
    const html = renderSearchForm({
      fromInput: 'porto',
      fromLocalitySelected: true,
      fromPanelOpen: true,
      fromSuggestions: {
        areas: [],
        exactStops: [
          {
            value: 'imperia porto maurizio',
            label: 'imperia porto maurizio (Porto Maurizio)',
            meta: 'Stop',
            type: 'exact-stop',
          },
        ],
        exactStopHeading: 'Porto Maurizio',
      },
    });

    expect(html).toContain('Choose departure stop');
    expect(html).not.toContain('Refine within Porto Maurizio');
    expect(html).not.toContain('data-option-type="area"');
    expect(html).toContain('data-from-value="imperia porto maurizio"');
    expect(html).toContain('imperia porto maurizio (Porto Maurizio)');
  });

  it('keeps exact-stop choices visible after a broad origin has been restored', () => {
    const html = renderSearchForm({
      t: createTranslator('en'),
      fromInput: 'Sanremo',
      fromLocalitySelected: true,
      fromPanelOpen: true,
      collapseOriginRefinement: true,
      fromSuggestions: {
        areas: [],
        exactStops: [
          { value: 'sanremo autostazione', label: 'sanremo autostazione (Sanremo)', meta: 'Stop', type: 'exact-stop' },
          { value: 'sanremo partenza', label: 'sanremo partenza (Sanremo)', meta: 'Stop', type: 'exact-stop' },
        ],
        exactStopHeading: 'Sanremo',
      },
    });

    expect(html).not.toContain('Refine stop in Sanremo');
    expect(html).not.toContain('data-expand-origin-refinement');
    expect(html).toContain('data-from-value="sanremo autostazione"');
    expect(html).toContain('data-from-value="sanremo partenza"');
  });

  it('renders a compact edit surface for an existing result instead of the full hero form', () => {
    const html = renderSearchForm({
      t: createTranslator('en'),
      compactResultMode: true,
      compactRouteLabel: 'Sanremo to Ventimiglia, Ponte Andrea Doria',
      dayType: 'feriale',
    });

    expect(html).toContain('class="route-edit-summary"');
    expect(html).toContain('Sanremo to Ventimiglia, Ponte Andrea Doria');
    expect(html).toContain('Weekday');
    expect(html).toContain('data-edit-search');
    expect(html).not.toContain('class="hero-copy"');
    expect(html).not.toContain('class="search-form search-form--capsule"');
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
    expect(html).toContain('Stop');
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

  it('treats an exact stop as destination-ready even without a chosen broad area', () => {
    const html = renderSearchForm({
      fromInput: 'diano marina',
      fromLocalitySelected: false,
      exactFromStop: { id: 'diano-marina', canonical: 'diano marina' },
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'exact-stop-destinations',
      destinationMessage: 'Direct destinations from this stop',
      reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    });

    expect(html).toContain('Only direct destinations from the selected departure side appear here.');
    expect(html).not.toContain('Choose a departure stop first to see direct destinations.');
    expect(html).toContain('Direct destinations from this stop');
  });

  it('shows an informational to panel without disabling the field before origin selection', () => {
    const html = renderSearchForm({
      fromInput: '',
      fromPanelOpen: false,
      toInput: '',
      toPanelOpen: true,
      destinationMode: 'informational',
      destinationMessage: 'Choose a departure stop first to see direct destinations.',
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

  it('guides users from route selection to selected departure details without a wizard', () => {
    const html = renderSearchForm({
      t: createTranslator('en'),
      fromLocalitySelected: true,
      exactFromStop: null,
      toStopSelected: true,
    });

    expect(html).toContain('Choose a real departure stop.');
    expect(html).toContain('Direct destinations appear after the origin is known.');
    expect(html).toContain('Select one departure to inspect exact trip details.');
  });

  it('renders translated hero and field copy in German', () => {
    const html = renderSearchForm({
      t: createTranslator('de'),
      destinationMessage: createTranslator('de')('search.destination.informational'),
    });

    expect(html).toContain('Riviera Dei Fiori Route Finder');
    expect(html).toContain('Finde direkte Riviera-Trasporti-Busse an der Riviera dei Fiori mit Riviera Dei Fiori Route Finder.');
    expect(html).toContain('Meinen Standort verwenden');
    expect(html).toContain('Abfahrten anzeigen');
  });

  it('renders network-wide search copy instead of corridor-specific placeholders', () => {
    const html = renderSearchForm({
      t: createTranslator('en'),
      fromPanelOpen: true,
      fromSuggestions: { areas: [], exactStops: [], exactStopHeading: '' },
    });

    expect(html).toContain('Choose departure stop');
    expect(html).toContain('placeholder="Choose departure stop"');
    expect(html).not.toContain('placeholder="Porto Maurizio"');
  });

  it('exposes mobile-friendly picker semantics for the From and To fields', () => {
    const html = renderSearchForm({
      fromPanelOpen: true,
      toPanelOpen: false,
    });

    expect(html).toContain('inputmode="search"');
    expect(html).toContain('enterkeyhint="next"');
    expect(html).toContain('enterkeyhint="search"');
    expect(html).toContain('aria-controls="from-picker-panel"');
    expect(html).toContain('aria-controls="to-picker-panel"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="from-picker-panel"');
  });

  it('renders route pickers with combobox listbox option semantics', () => {
    const html = renderSearchForm({
      fromPanelOpen: true,
      fromSuggestions: {
        areas: [],
        exactStops: [
          {
            value: 'imperia porto maurizio',
            label: 'imperia porto maurizio (Porto Maurizio)',
            meta: 'Stop',
            type: 'exact-stop',
          },
        ],
        exactStopHeading: 'Porto Maurizio',
      },
      toPanelOpen: true,
      destinationMode: 'locality-destinations',
      destinationMessage: 'Direct destinations from this area',
      selectedLocalityLabel: 'Porto Maurizio',
      reachableDestinations: [
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
      ],
      fromActiveOptionId: 'from-picker-option-0',
      toActiveOptionId: 'to-picker-option-0',
    });

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-activedescendant="from-picker-option-0"');
    expect(html).toContain('aria-activedescendant="to-picker-option-0"');
    expect(html).toContain('id="from-picker-panel" class="picker-panel" data-panel="from" role="listbox"');
    expect(html).toContain('id="to-picker-panel" class="picker-panel" data-panel="to" role="listbox"');
    expect(html).toContain('id="from-picker-option-0"');
    expect(html).not.toContain('id="from-picker-option-1"');
    expect(html).toContain('id="to-picker-option-0"');
    expect(html).toContain('role="option"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
  });
});
