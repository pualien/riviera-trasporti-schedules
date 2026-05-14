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
});
