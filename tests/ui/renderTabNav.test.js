import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderTabNav } from '../../src/ui/renderTabNav.js';

describe('renderTabNav', () => {
  it('marks the active tab and exposes tab actions', () => {
    const html = renderTabNav({ activeTab: 'browse', t: createTranslator('en') });

    expect(html).toContain('data-tab-target="search"');
    expect(html).toContain('data-tab-target="trains"');
    expect(html).toContain('data-tab-target="flixbus"');
    expect(html).toContain('data-tab-target="blablacar"');
    expect(html).toContain('data-tab-target="browse"');
    expect(html).toContain('data-tab-target="saved"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Browse');
  });
});
