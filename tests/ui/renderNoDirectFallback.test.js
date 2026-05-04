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
});
