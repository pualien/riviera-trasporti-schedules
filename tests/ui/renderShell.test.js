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
});
