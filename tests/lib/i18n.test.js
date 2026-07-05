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

  it('uses polished Italian accents and apostrophes in visible copy', () => {
    const t = createTranslator('it');

    expect(t('shell.seoBody')).toContain('località');
    expect(t('shell.sourceTrustBody')).toContain('è indipendente');
    expect(t('search.guidance.destination')).toContain("l'origine");
    expect(t('results.soonestArrival')).toBe('Arrivo più rapido');
    expect(t('location.error.browser')).toContain('può');
  });

  it('stores only supported language codes', () => {
    const writes = [];
    const storage = { setItem: (key, value) => writes.push([key, value]) };

    persistLanguage(storage, 'de');
    persistLanguage(storage, 'xx');

    expect(writes).toEqual([['language', 'de']]);
  });

  it('translates selected-trip map status copy in every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const t = createTranslator(language.code);

      expect(t('results.selectedTripDetails')).not.toBe('results.selectedTripDetails');
      expect(t('results.detailsAction')).not.toBe('results.detailsAction');
      expect(t('results.selectedAction')).not.toBe('results.selectedAction');
      expect(t('results.mapPartial')).not.toBe('results.mapPartial');
      expect(t('results.mapPrecision')).not.toBe('results.mapPrecision');
      expect(t('results.mapNoCoordinates')).not.toBe('results.mapNoCoordinates');
      expect(t('results.mapLoadFailed')).not.toBe('results.mapLoadFailed');
      expect(t('results.mapLoadFailedDetail')).not.toBe('results.mapLoadFailedDetail');
      expect(t('location.manualSearch')).not.toBe('location.manualSearch');
      expect(t('location.error.map')).not.toBe('location.error.map');
      expect(t('search.guidance.origin')).not.toBe('search.guidance.origin');
      expect(t('search.guidance.destination')).not.toBe('search.guidance.destination');
      expect(t('search.guidance.departure')).not.toBe('search.guidance.departure');
      expect(t('shell.routesIndex')).not.toBe('shell.routesIndex');
      expect(t('shell.globalAlternatives')).not.toBe('shell.globalAlternatives');
      expect(t('search.editSearch')).not.toBe('search.editSearch');
      expect(t('search.fromPanel.refineStop')).not.toBe('search.fromPanel.refineStop');
      expect(t('tabs.trains')).not.toBe('tabs.trains');
      expect(t('provider.flixbus.title')).not.toBe('provider.flixbus.title');
      expect(t('provider.blablacar.hint')).not.toBe('provider.blablacar.hint');
    }
  });
});
