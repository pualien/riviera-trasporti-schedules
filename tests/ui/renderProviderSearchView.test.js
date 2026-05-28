import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderProviderSearchView } from '../../src/ui/renderProviderSearchView.js';

describe('renderProviderSearchView', () => {
  it('renders the Trenitalia search handoff as a standalone route form', () => {
    const html = renderProviderSearchView({
      provider: 'trains',
      t: createTranslator('it'),
      values: {
        from: 'Imperia',
        to: 'Sanremo',
        date: '2026-06-01',
      },
      actionUrl: 'https://www.lefrecce.it/',
    });

    expect(html).toContain('Cerca treni');
    expect(html).toContain('name="provider-from"');
    expect(html).toContain('value="Imperia"');
    expect(html).toContain('name="provider-to"');
    expect(html).toContain('value="Sanremo"');
    expect(html).toContain('type="date"');
    expect(html).toContain('data-provider-search="trains"');
    expect(html).toContain('data-provider-action-url="https://www.lefrecce.it/"');
    expect(html).toContain('button-logo--trenitalia');
  });

  it('renders a prefilled FlixBus action URL when one is available', () => {
    const html = renderProviderSearchView({
      provider: 'flixbus',
      t: createTranslator('it'),
      values: {
        from: 'Sanremo',
        to: 'Ventimiglia',
        date: '2026-06-01',
      },
      actionUrl: 'https://shop.flixbus.it/search?departureCity=83f11a76-676c-4cd0-ae59-668e1a716496&arrivalCity=32183c0e-909d-48ce-8c32-7a0f77b4db5c&rideDate=01.06.2026&adult=1&_locale=it',
    });

    expect(html).toContain('Cerca FlixBus');
    expect(html).toContain('data-provider-search="flixbus"');
    expect(html).toContain('departureCity=83f11a76-676c-4cd0-ae59-668e1a716496');
    expect(html.match(/Apri ricerca/g)).toHaveLength(1);
    expect(html).toContain('button-logo--flixbus');
  });
});
