import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  createTranslator,
  persistLanguage,
  readStoredLanguage,
} from '../../src/lib/i18n.js';

describe('i18n helpers', () => {
  it('falls back to Italian when storage contains no valid language', () => {
    expect(readStoredLanguage({ getItem: () => null })).toBe(DEFAULT_LANGUAGE);
    expect(readStoredLanguage({ getItem: () => 'pt' })).toBe(DEFAULT_LANGUAGE);
  });

  it('restores a saved supported language code', () => {
    expect(readStoredLanguage({ getItem: () => 'fr' })).toBe('fr');
  });

  it('translates shell and search copy for a non-default language', () => {
    const t = createTranslator('es');

    expect(SUPPORTED_LANGUAGES.map((language) => language.code)).toEqual(['it', 'en', 'fr', 'de', 'es']);
    expect(t('shell.feedback')).toBe('Dar consejos');
    expect(t('search.submit')).toBe('Mostrar salidas');
  });

  it('stores only supported language codes', () => {
    const writes = [];
    const storage = { setItem: (key, value) => writes.push([key, value]) };

    persistLanguage(storage, 'de');
    persistLanguage(storage, 'xx');

    expect(writes).toEqual([['language', 'de']]);
  });
});
