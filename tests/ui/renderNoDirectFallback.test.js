import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderNoDirectFallback } from '../../src/ui/renderNoDirectFallback.js';

describe('renderNoDirectFallback', () => {
  it('renders transfer guidance, PDF link, and alternate stop suggestions', () => {
    const html = renderNoDirectFallback({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      suggestions: [
        {
          kind: 'origin-stop',
          stopId: 'imperia-porto-maurizio-piazza-dante',
          label: 'Imperia Porto Maurizio Piazza Dante',
        },
      ],
    });

    expect(html).toContain('No direct ride found');
    expect(html).toContain('This journey may still require a transfer');
    expect(html).toContain('Imperia Porto Maurizio Piazza Dante');
    expect(html).toContain('https://example.com/riviera.pdf');
  });

  it('renders the taxi secondary option when fallback taxi coverage exists', () => {
    const html = renderNoDirectFallback({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      suggestions: [],
      taxiOption: {
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Taxi Imperia',
        phone: '+39 0183 3785',
        callHref: 'tel:+3901833785',
        sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
        verifiedAt: '2026-05-12',
      },
    });

    expect(html).toContain('Secondary option');
    expect(html).toContain('Taxi Imperia');
    expect(html).toContain('tel:+3901833785');
  });
});
