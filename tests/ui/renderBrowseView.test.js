import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderBrowseView } from '../../src/ui/renderBrowseView.js';

const browseIndex = {
  lines: [
    {
      lineId: '12',
      directions: ['Origin to Destination'],
      stops: [
        { id: 'origin', canonical: 'Origin' },
        { id: 'destination', canonical: 'Destination' },
      ],
    },
  ],
  stops: [
    { id: 'origin', canonical: 'Origin', lines: ['12'] },
  ],
};

const countOccurrences = (html, needle) => html.split(needle).length - 1;

describe('renderBrowseView', () => {
  it('renders line details and search seed actions', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex,
      mode: 'lines',
      selectedLineId: '12',
    });

    expect(html).toContain('data-browse-mode="stops"');
    expect(html).toContain('data-browse-line="12"');
    expect(html).toContain('Origin to Destination');
    expect(html).toContain('data-search-from-stop="origin"');
    expect(html).toContain('data-search-to-stop="destination"');
  });

  it('renders grouped line choices with a browse search field', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex: {
        lines: [
          {
            lineId: '2',
            directions: ['Imperia to Andora'],
            stops: [{ id: 'imperia', canonical: 'Imperia' }],
          },
          {
            lineId: '12',
            directions: ['Sanremo to Andora'],
            stops: [{ id: 'sanremo', canonical: 'Sanremo' }],
          },
        ],
        stops: [],
      },
      mode: 'lines',
      query: 'andora',
    });

    expect(html).toContain('name="browseFilter"');
    expect(html).toContain('value="andora"');
    expect(html).toContain('class="browse-group"');
    expect(html).toContain('Lines 1-9');
    expect(html).toContain('Lines 10-19');
    expect(html).toContain('data-browse-line="2"');
    expect(html).toContain('data-browse-line="12"');
  });

  it('renders stop details and serving lines', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex,
      mode: 'stops',
      selectedStopId: 'origin',
    });

    expect(html).toContain('data-browse-stop="origin"');
    expect(html).toContain('Line 12');
  });

  it('caps the initial stop list and asks riders to search the stop catalog', () => {
    const stops = Array.from({ length: 55 }, (_, index) => ({
      id: `stop-${index}`,
      canonical: `Stop ${String(index).padStart(2, '0')}`,
      lines: ['12'],
    }));

    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex: { lines: [], stops },
      mode: 'stops',
    });

    expect(html).toContain('Search stops');
    expect(html).toContain('Showing 48 of 55 stops. Search to narrow the list.');
    expect(countOccurrences(html, 'data-browse-stop=')).toBe(48);
    expect(html).toContain('data-browse-stop="stop-47"');
    expect(html).not.toContain('data-browse-stop="stop-48"');
  });

  it('filters and groups stops by query instead of rendering the full catalog', () => {
    const html = renderBrowseView({
      t: createTranslator('en'),
      browseIndex: {
        lines: [],
        stops: [
          { id: 'sanremo', canonical: 'Sanremo Autostazione', lines: ['12'] },
          { id: 'san-lorenzo', canonical: 'San Lorenzo', lines: ['12'] },
          { id: 'imperia', canonical: 'Imperia', lines: ['2'] },
        ],
      },
      mode: 'stops',
      query: 'san',
    });

    expect(html).toContain('Stops starting with S');
    expect(html).toContain('data-browse-stop="sanremo"');
    expect(html).toContain('data-browse-stop="san-lorenzo"');
    expect(html).not.toContain('data-browse-stop="imperia"');
  });
});
