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
});
