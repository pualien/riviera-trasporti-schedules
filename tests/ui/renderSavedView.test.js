import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../src/lib/i18n.js';
import { renderSavedView } from '../../src/ui/renderSavedView.js';

const route = {
  identity: 'porto|to|feriale',
  fromInput: 'Porto Maurizio',
  toInput: 'Sanremo Autostazione',
  dayType: 'feriale',
  timestamp: '2026-05-14T09:00:00.000Z',
  resultType: 'results',
  resultCount: 4,
};

describe('renderSavedView', () => {
  it('renders favorites and recents with restore actions', () => {
    const html = renderSavedView({
      t: createTranslator('en'),
      favorites: [route],
      recents: [{ ...route, identity: 'recent' }],
      available: true,
    });

    expect(html).toContain('Saved routes');
    expect(html).toContain('Recent searches');
    expect(html).toContain('data-saved-route="porto|to|feriale"');
    expect(html).toContain('data-remove-favorite="porto|to|feriale"');
    expect(html).toContain('data-recent-route="recent"');
    expect(html).toContain('Porto Maurizio');
    expect(html).toContain('Sanremo Autostazione');
  });

  it('renders a storage unavailable message', () => {
    const html = renderSavedView({
      t: createTranslator('en'),
      favorites: [],
      recents: [],
      available: false,
    });

    expect(html).toContain('Saved routes are unavailable in this browser');
  });
});
