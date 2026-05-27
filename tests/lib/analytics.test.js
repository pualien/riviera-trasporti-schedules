import { describe, expect, it } from 'vitest';
import {
  pushRouteSaveEvent,
  pushRouteSearchEvent,
  pushRouteShareEvent,
} from '../../src/lib/analytics.js';

describe('pushRouteSearchEvent', () => {
  it('pushes the search payload with result count and no-result flag', () => {
    const windowObject = {};

    pushRouteSearchEvent(windowObject, {
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 3,
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_search',
        from: 'Porto Maurizio',
        to: 'Sanremo',
        day_type: 'feriale',
        results_count: 3,
        no_results: false,
      },
    ]);
  });

  it('marks searches with no matches explicitly', () => {
    const windowObject = { dataLayer: [] };

    pushRouteSearchEvent(windowObject, {
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'festivo',
      resultsCount: 0,
    });

    expect(windowObject.dataLayer[0]).toMatchObject({
      event: 'route_search',
      results_count: 0,
      no_results: true,
    });
  });
});

describe('route action analytics', () => {
  it('pushes route_save with route context and save status', () => {
    const windowObject = { dataLayer: [] };

    pushRouteSaveEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 7,
      saveStatus: 'saved',
    });

    expect(windowObject.dataLayer[0]).toEqual({
      event: 'route_save',
      from: 'Imperia',
      to: 'Sanremo',
      day_type: 'feriale',
      results_count: 7,
      save_status: 'saved',
    });
  });

  it('pushes route_share with route context and share method', () => {
    const windowObject = {};

    pushRouteShareEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'sabato',
      resultsCount: 3,
      shareMethod: 'whatsapp',
      shareUrl: 'https://azzuriva.example/app?utm_source=share_whatsapp',
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_share',
        from: 'Imperia',
        to: 'Sanremo',
        day_type: 'sabato',
        results_count: 3,
        share_method: 'whatsapp',
        share_url: 'https://azzuriva.example/app?utm_source=share_whatsapp',
      },
    ]);
  });
});
