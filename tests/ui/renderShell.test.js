import { describe, expect, it } from 'vitest';
import { createTranslator, SUPPORTED_LANGUAGES } from '../../src/lib/i18n.js';
import { renderShell } from '../../src/ui/renderShell.js';

describe('renderShell', () => {
  it('renders the approved lockup, descriptor, and official-site link', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'en',
      languages: SUPPORTED_LANGUAGES,
      t: createTranslator('en'),
    });

    expect(html).toContain('./assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png');
    expect(html).toContain('alt="Riviera Trasporti Ricerca Percorsi wordmark"');
    expect(html).toContain('Official PDF, clearer route lookup');
    expect(html).toContain('Official Riviera Trasporti site');
    expect(html).toContain('<section>Body</section>');
  });

  it('renders the language selector and translated feedback action', () => {
    const html = renderShell('<section>Body</section>', {
      language: 'fr',
      languages: SUPPORTED_LANGUAGES,
      t: createTranslator('fr'),
    });

    expect(html).toContain('value="fr" selected');
    expect(html).toContain('Donner un conseil');
    expect(html).toContain('Site officiel Riviera Trasporti');
    expect(html).toContain('name="language"');
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

    expect(html).toContain('Riviera Trasporti bus timetable');
    expect(html).toContain('Imperia');
    expect(html).toContain('Andora');
    expect(html).toContain('All verified taxi numbers');
    expect(html).toContain('Taxi Imperia');
    expect(html).toContain('Porto Maurizio');
    expect(html).toContain('Radio Taxi Sanremo');
    expect(html).toContain('Arma di Taggia');
    expect(html).toContain('Taggia');
    expect(html).toContain('Radio Taxi Albenga');
    expect(html).toContain('tel:+3901820303');
  });
});
