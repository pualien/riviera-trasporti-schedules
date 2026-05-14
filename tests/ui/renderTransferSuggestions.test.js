import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderTransferSuggestions } from '../../src/ui/renderTransferSuggestions.js';

const suggestion = {
  transferStopName: 'Imperia Oneglia',
  waitMinutes: 7,
  totalDurationMinutes: 60,
  isFuture: true,
  firstLeg: {
    lineId: '12',
    departureTime: '08:00',
    arrivalTime: '08:20',
    sourcePage: 10,
  },
  secondLeg: {
    lineId: '2',
    departureTime: '08:27',
    arrivalTime: '09:00',
    sourcePage: 11,
  },
};

describe('renderTransferSuggestions', () => {
  it('renders conservative transfer suggestions with PDF links', () => {
    const html = renderTransferSuggestions({
      t: createTranslator('en'),
      suggestions: [suggestion],
      pdfUrl: 'https://example.com/rt.pdf',
    });

    expect(html).toContain('Possible one-change options');
    expect(html).toContain('Imperia Oneglia');
    expect(html).toContain('Line 12');
    expect(html).toContain('Line 2');
    expect(html).toContain('7 min');
    expect(html).toContain('https://example.com/rt.pdf#page=10');
    expect(html).toContain('https://example.com/rt.pdf#page=11');
  });

  it('renders an unavailable message when no suggestions exist', () => {
    const html = renderTransferSuggestions({
      t: createTranslator('en'),
      suggestions: [],
      pdfUrl: 'https://example.com/rt.pdf',
    });

    expect(html).toContain('No conservative one-change option found');
  });
});
