import { describe, expect, it } from 'vitest';
import { createTranslator, SUPPORTED_LANGUAGES } from '../../src/lib/i18n.js';
import { renderShell } from '../../src/ui/renderShell.js';

function getTaxiPanel(html) {
  return html.match(/<div class="taxi-panel">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? '';
}

const countOccurrences = (html, needle) => html.split(needle).length - 1;

describe('renderShell', () => {
  it('renders the Riviera Dei Fiori Route Finder wordmark, descriptor, and official-site link', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      t: createTranslator('en'),
    });

    expect(html).toContain('class="brand-wordmark"');
    expect(html).toContain('Riviera Dei Fiori Route Finder');
    expect(html).toContain('Riviera dei Fiori bus route lookup');
    expect(html).toContain('Browse routes');
    expect(html).toContain('href="https://pualien.github.io/riviera-trasporti-schedules/routes/"');
    expect(html).toContain('Official Riviera Trasporti site');
    expect(html).toContain('<section>Body</section>');
    expect(html).not.toContain('brand-lockup-image');
  });

  it('renders the language selector and translated feedback action', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'fr',
      languages: SUPPORTED_LANGUAGES,
      t: createTranslator('fr'),
    });

    expect(html).toContain('value="fr" selected');
    expect(html).toContain('Donner un conseil');
    expect(html).toContain('href="https://forms.gle/tjo52ginwrjUGdMC6"');
    expect(html).not.toContain('PLACEHOLDER');
    expect(html).toContain('Site officiel Riviera Trasporti');
    expect(html).toContain('name="language"');
  });

  it('groups secondary topbar actions into a mobile disclosure menu', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      t: createTranslator('en'),
    });

    expect(html).toContain('class="topbar-secondary-actions topbar-secondary-actions--desktop"');
    expect(html).toContain('class="topbar-more-actions topbar-more-actions--mobile"');
    expect(html).toContain('<summary class="topbar-link topbar-more-summary">More</summary>');
    expect(countOccurrences(html, 'href="https://forms.gle/tjo52ginwrjUGdMC6"')).toBe(2);
    expect(countOccurrences(html, 'name="language"')).toBe(2);
  });

  it('renders top-level tab navigation when provided', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      tabNavigation: '<nav class="app-tabs">Tabs</nav>',
      t: createTranslator('en'),
    });

    expect(html).toContain('<nav class="app-tabs">Tabs</nav>');
  });

  it('places PWA controls in the topbar actions before the language selector', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      pwaControl: '<div data-pwa-control>PWA</div>',
      t: createTranslator('en'),
    });

    expect(html).toContain('<div data-pwa-control>PWA</div>');
    expect(html.indexOf('data-pwa-control')).toBeLessThan(html.indexOf('class="language-selector"'));
  });

  it('renders lead and utility ad slots only when configured', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      adSlots: {
        lead: '<div>Lead sponsor</div>',
        utility: '<div>Route sponsor</div>',
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('data-ad-slot="shell-lead"');
    expect(html).toContain('data-ad-slot="shell-utility"');
    expect(html).toContain('<div>Lead sponsor</div>');
    expect(html).toContain('<div>Route sponsor</div>');
    expect(html.indexOf('<section>Body</section>')).toBeLessThan(html.indexOf('data-ad-slot="shell-lead"'));
    expect(html.indexOf('data-ad-slot="shell-utility"')).toBeGreaterThan(html.indexOf('<section>Body</section>'));
  });

  it('keeps the app content before crawl-support copy on mobile-first render order', () => {
    const html = renderShell('<section id="route-search">Route search</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      tabNavigation: '<nav class="app-tabs">Tabs</nav>',
      taxiDirectory: [
        {
          serviceId: 'taxi-imperia',
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Taxi Imperia',
          phone: '+39 0183 3785',
          phones: [{ label: '+39 0183 3785', href: 'tel:+3901833785' }],
          sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Imperia'],
        },
      ],
      t: createTranslator('en'),
    });

    expect(html.indexOf('<nav class="app-tabs">Tabs</nav>')).toBeLessThan(html.indexOf('<section id="route-search">'));
    expect(html.indexOf('<section id="route-search">')).toBeLessThan(html.indexOf('class="seo-support-copy"'));
    expect(html.indexOf('<section id="route-search">')).toBeLessThan(html.indexOf('class="taxi-directory-section"'));
  });

  it('renders the dataset freshness marker when metadata is available', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      datasetInfo: {
        source: {
          title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
          effectiveDate: '2026-04-01',
        },
        builtAt: '2026-05-05T08:30:00.000Z',
      },
      t: createTranslator('en'),
    });

    expect(html).toContain('Updated from official PDF');
    expect(html).toContain('2026-04-01');
    expect(html).toContain('2026-05-05');
  });

  it('renders supporting crawlable network copy in the shell', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      taxiDirectory: [
        {
          serviceId: 'taxi-imperia',
          provinceId: 'imperia',
          provinceLabel: 'Provincia di Imperia',
          serviceLabel: 'Taxi Imperia',
          phone: '+39 0183 3785',
          phones: [{ label: '+39 0183 3785', href: 'tel:+3901833785' }],
          sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Imperia', 'Porto Maurizio'],
        },
        {
          serviceId: 'radio-taxi-albenga',
          provinceId: 'savona',
          provinceLabel: 'Provincia di Savona',
          serviceLabel: 'Radio Taxi Albenga',
          phone: '+39 328 7254729',
          phones: [
            { label: '+39 328 7254729', href: 'tel:+393287254729' },
            { label: '+39 0182 0303', href: 'tel:+3901820303' },
          ],
          sourceUrl: 'https://www.radiotaxialbenga.it/',
          verifiedAt: '2026-05-13',
          coverageLabels: ['Andora', 'Albenga'],
        },
      ],
      t: createTranslator('en'),
    });

    const taxiPanel = getTaxiPanel(html);

    expect(html).toContain('Riviera Dei Fiori Route Finder for the Riviera dei Fiori');
    expect(html).toContain('Riviera Dei Fiori Route Finder is independent: bus times still point back to the official Riviera Trasporti PDF.');
    expect(html).toContain('Imperia');
    expect(html).toContain('Andora');
    expect(html).toContain('All verified taxi numbers');
    expect(html).toContain('Taxi Imperia');
    expect(html).toContain('Porto Maurizio');
    expect(html).toContain('Radio Taxi Albenga');
    expect(html).toContain('tel:+3901820303');
    expect(countOccurrences(html, '<div class="taxi-panel">')).toBe(1);
    expect(countOccurrences(taxiPanel, '<article class="taxi-panel-entry">')).toBe(2);
    expect(taxiPanel).toContain('<h4>Taxi Imperia</h4>');
    expect(taxiPanel).toContain('<h4>Radio Taxi Albenga</h4>');
    expect(taxiPanel).toContain('If you need a fallback in Provincia di Imperia, you can call a verified taxi contact.');
    expect(taxiPanel).toContain('If you need a fallback in Provincia di Savona, you can call a verified taxi contact.');
    expect(taxiPanel).toContain('href="https://www.comune.imperia.it/it/page/taxi-imperia"');
    expect(taxiPanel).toContain('href="https://www.radiotaxialbenga.it/"');
    expect(taxiPanel).toContain('Verified 2026-05-13');
    expect(html).not.toContain('class="taxi-option-card"');
  });
});
