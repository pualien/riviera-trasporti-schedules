import { describe, expect, it } from 'vitest';
import {
  pushBrowseInteractionEvent,
  pushLandingContextEvent,
  pushOutboundClickEvent,
  pushRouteNoDirectViewedEvent,
  pushRouteResultViewedEvent,
  pushRouteSaveEvent,
  pushRouteSearchEvent,
  pushRouteShareEvent,
  pushShareModalOpenedEvent,
  pushSharedRouteOpenedEvent,
  pushSharedRouteRestoredEvent,
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

describe('growth analytics', () => {
  it('pushes landing context without raw URLs', () => {
    const windowObject = {};

    pushLandingContextEvent(windowObject, {
      tab: 'search',
      hasRouteParams: true,
      hasShareUtm: true,
      utmSource: 'share_whatsapp',
      utmMedium: 'route_share',
      utmCampaign: 'azzuriva_route_share',
      referrerType: 'direct',
      language: 'it',
    });

    expect(windowObject.dataLayer[0]).toEqual({
      event: 'landing_context',
      tab: 'search',
      has_route_params: true,
      has_share_utm: true,
      utm_source: 'share_whatsapp',
      utm_medium: 'route_share',
      utm_campaign: 'azzuriva_route_share',
      referrer_type: 'direct',
      language: 'it',
    });
  });

  it('pushes result and no-direct view events', () => {
    const windowObject = { dataLayer: [] };

    pushRouteResultViewedEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 8,
      hasNextDeparture: true,
      hasTaxiFallback: true,
      sourceContext: 'share',
    });

    pushRouteNoDirectViewedEvent(windowObject, {
      from: 'Sanremo',
      to: 'Dolceacqua',
      dayType: 'festivo',
      hasTransferSuggestions: false,
      hasTaxiFallback: true,
      sourceContext: 'organic',
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_result_viewed',
        from: 'Imperia',
        to: 'Sanremo',
        day_type: 'feriale',
        results_count: 8,
        has_next_departure: true,
        has_taxi_fallback: true,
        source_context: 'share',
      },
      {
        event: 'route_no_direct_viewed',
        from: 'Sanremo',
        to: 'Dolceacqua',
        day_type: 'festivo',
        has_transfer_suggestions: false,
        has_taxi_fallback: true,
        source_context: 'organic',
      },
    ]);
  });

  it('pushes share, restore, outbound, and browse diagnostics', () => {
    const windowObject = { dataLayer: [] };

    pushShareModalOpenedEvent(windowObject, {
      shareScope: 'departure',
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'sabato',
    });
    pushSharedRouteOpenedEvent(windowObject, {
      utmSource: 'share_whatsapp',
      shareScope: 'departure',
      hasCompleteRouteState: true,
      dayType: 'sabato',
    });
    pushSharedRouteRestoredEvent(windowObject, {
      restoreStatus: 'results',
      resultsCount: 4,
      selectedDepartureRestored: true,
    });
    pushOutboundClickEvent(windowObject, {
      targetType: 'official_pdf',
      context: 'result',
    });
    pushBrowseInteractionEvent(windowObject, {
      browseAction: 'line_selected',
      mode: 'lines',
      queryPresent: false,
    });

    expect(windowObject.dataLayer.map((entry) => entry.event)).toEqual([
      'share_modal_opened',
      'shared_route_opened',
      'shared_route_restored',
      'outbound_click',
      'browse_interaction',
    ]);
  });
});
