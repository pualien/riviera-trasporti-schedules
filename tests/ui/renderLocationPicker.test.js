import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderLocationPicker } from '../../src/ui/renderLocationPicker.js';

describe('renderLocationPicker', () => {
  it('explains that GPS may still require exact stop confirmation inside a locality', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      t: createTranslator('en'),
      nearbyStops: [
        {
          stopId: 'imperia-porto-maurizio',
          canonical: 'imperia porto maurizio',
          localityLabel: 'Porto Maurizio',
          distanceMeters: 180,
        },
      ],
    });

    expect(html).toContain('Choose an area first, then confirm the exact timetable stop if the nearby match is ambiguous.');
    expect(html).toContain('Porto Maurizio');
  });

  it('translates nearby-stop guidance while leaving stop labels unchanged', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      t: createTranslator('fr'),
      nearbyStops: [
        {
          stopId: 'imperia-porto-maurizio',
          canonical: 'imperia porto maurizio',
          localityLabel: 'Porto Maurizio',
          distanceMeters: 180,
        },
      ],
    });

    expect(html).toContain('Choisissez d abord une zone');
    expect(html).toContain('Porto Maurizio');
  });

  it('renders denied location errors without an empty map shell', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'error',
      message: 'Location access was denied. Type the stop name manually instead.',
      t: createTranslator('en'),
    });

    expect(html).toContain('Location access was denied');
    expect(html).not.toContain('id="location-picker-map"');
    expect(html).toContain('Use manual search');
  });

  it('renders ready nearby stop choices when the map script is unavailable', () => {
    const html = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      mapState: 'unavailable',
      mapMessage: 'The map could not load. Nearby stop choices are still available.',
      t: createTranslator('en'),
      nearbyStops: [
        {
          stopId: 'imperia-porto-maurizio',
          canonical: 'imperia porto maurizio',
          localityLabel: 'Porto Maurizio',
          distanceMeters: 180,
        },
      ],
    });

    expect(html).toContain('The map could not load');
    expect(html).toContain('imperia porto maurizio');
    expect(html).toContain('data-map-status="unavailable"');
  });

  it('renders loading state inside the map shell', () => {
    const html = renderLocationPicker({
      fieldName: 'to',
      state: 'loading',
      t: createTranslator('en'),
    });

    expect(html).toContain('Looking for the closest stops');
    expect(html).toContain('Loading map');
    expect(html).toContain('data-map-status="loading"');
  });

  it('escapes unavailable map messages and map status attributes', () => {
    const messageHtml = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      mapState: 'unavailable',
      mapMessage: '<img src=x onerror="alert(1)">',
      t: createTranslator('en'),
    });
    const statusHtml = renderLocationPicker({
      fieldName: 'from',
      state: 'ready',
      mapState: 'ready" autofocus onfocus="alert(1)',
      t: createTranslator('en'),
    });

    expect(messageHtml).not.toContain('<img');
    expect(messageHtml).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(statusHtml).not.toContain('data-map-status="ready" autofocus');
    expect(statusHtml).toContain('data-map-status="ready&quot; autofocus onfocus=&quot;alert(1)"');
  });
});
