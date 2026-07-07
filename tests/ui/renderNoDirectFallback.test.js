import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderNoDirectFallback } from '../../src/ui/renderNoDirectFallback.js';

function getTaxiPanel(html) {
  return html.match(/<div class="taxi-panel">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? '';
}

const countOccurrences = (html, needle) => html.split(needle).length - 1;

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
          action: {
            type: 'set-origin-stop',
            stopId: 'imperia-porto-maurizio-piazza-dante',
          },
        },
      ],
    });

    expect(html).toContain('No direct ride found');
    expect(html).toContain('class="empty-state empty-state--fallback" data-result-anchor');
    expect(html).toContain('This journey may still require a transfer');
    expect(html).toContain('Imperia Porto Maurizio Piazza Dante');
    expect(html).toContain('data-no-direct-action="set-origin-stop"');
    expect(html).toContain('data-stop-id="imperia-porto-maurizio-piazza-dante"');
    expect(html).toContain('<button type="button"');
    expect(html).toContain('https://example.com/riviera.pdf');
    expect(html).toContain('No conservative one-change option found');
  });

  it('renders taxi route options when fallback taxi coverage exists', () => {
    const html = renderNoDirectFallback({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf',
      suggestions: [],
      taxiOptions: [
        {
          serviceId: 'radio-taxi-sanremo',
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Radio Taxi Sanremo',
          phone: '+39 0184 541454',
          phones: [{ label: '+39 0184 541454', href: 'tel:+390184541454' }],
          sourceUrl: 'https://radiotaxisanremo.com/',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
        },
      ],
    });

    const taxiPanel = getTaxiPanel(html);

    expect(html).toContain('No bus? Alternatives');
    expect(html).toContain('Use these only when no direct bus remains today.');
    expect(html).toContain('class="no-bus-alternatives"');
    expect(html).toContain('Taxi numbers for this route');
    expect(html).toContain('Radio Taxi Sanremo');
    expect(html).toContain('Taggia');
    expect(html).toContain('tel:+390184541454');
    expect(countOccurrences(html, '<div class="taxi-panel">')).toBe(1);
    expect(countOccurrences(taxiPanel, '<article class="taxi-panel-entry">')).toBe(1);
    expect(taxiPanel).toContain('<h4>Radio Taxi Sanremo</h4>');
    expect(taxiPanel).toContain('If you need a fallback in Provincia di Imperia, you can call a verified taxi contact.');
    expect(taxiPanel).toContain('href="https://radiotaxisanremo.com/"');
    expect(taxiPanel).toContain('Verified 2026-05-13');
    expect(html).not.toContain('class="taxi-option-card"');
  });

  it('escapes the fallback PDF href', () => {
    const html = renderNoDirectFallback({
      t: createTranslator('en'),
      routeLabel: 'Porto Maurizio -> Sanremo',
      pdfUrl: 'https://example.com/riviera.pdf?name="unsafe"',
      suggestions: [],
    });

    expect(html).toContain('href="https://example.com/riviera.pdf?name=&quot;unsafe&quot;"');
    expect(html).not.toContain('href="https://example.com/riviera.pdf?name="unsafe""');
  });
});
