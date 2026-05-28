import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const importConfig = JSON.parse(
  readFileSync(new URL('../../gtm-container-import.json', import.meta.url), 'utf8'),
);

function findParameter(parameters, key) {
  return parameters.find((parameter) => parameter.key === key);
}

function findVariable(name) {
  return importConfig.containerVersion.variable.find((variable) => variable.name === name);
}

function constantValue(variableName) {
  return findParameter(findVariable(variableName).parameter, 'value').value;
}

function customEventTrigger(eventName) {
  return importConfig.containerVersion.trigger.find((trigger) => (
    trigger.name === `Custom Event - ${eventName}`
  ));
}

function eventTag(destination, eventName) {
  return importConfig.containerVersion.tag.find((tag) => (
    tag.name === `${destination} - Event - ${eventName}`
  ));
}

describe('GTM container import', () => {
  it('targets the installed GTM container with the requested analytics destinations', () => {
    expect(importConfig.exportFormatVersion).toBe(2);
    expect(importConfig.containerVersion.container.publicId).toBe('GTM-WWVLPF5M');
    expect(constantValue('Riviera Dei Fiori Route Finder - GA4 Measurement ID')).toBe('G-8MXQM6YJEV');
    expect(constantValue('Riviera Dei Fiori Route Finder - Mixpanel Token')).toBe('ea2efc9dafb9a379253ed093bed9c9dd');
  });

  it('sends the route_search dataLayer event to both GA4 and Mixpanel', () => {
    const tags = importConfig.containerVersion.tag;
    const routeSearchTrigger = importConfig.containerVersion.trigger.find((trigger) => (
      trigger.name === 'Custom Event - route_search'
    ));
    const ga4RouteSearchTag = tags.find((tag) => tag.name === 'GA4 - Event - route_search');
    const mixpanelRouteSearchTag = tags.find((tag) => tag.name === 'Mixpanel - Event - route_search');

    expect(routeSearchTrigger).toMatchObject({
      triggerId: '10',
      type: 'CUSTOM_EVENT',
    });
    expect(routeSearchTrigger.customEventFilter[0].parameter[1].value).toBe('route_search');

    expect(ga4RouteSearchTag).toMatchObject({
      type: 'gaawe',
      firingTriggerId: ['10'],
    });
    expect(findParameter(ga4RouteSearchTag.parameter, 'eventName').value).toBe('route_search');
    expect(findParameter(ga4RouteSearchTag.parameter, 'measurementIdOverride').value).toBe(
      '{{Riviera Dei Fiori Route Finder - GA4 Measurement ID}}',
    );

    const eventParameters = findParameter(ga4RouteSearchTag.parameter, 'eventSettingsTable')
      .list.map((entry) => entry.map.find((item) => item.key === 'parameter').value);
    expect(eventParameters).toEqual(['from', 'to', 'day_type', 'results_count', 'no_results']);

    expect(mixpanelRouteSearchTag).toMatchObject({
      type: 'html',
      firingTriggerId: ['10'],
      setupTag: [
        {
          tagName: 'Mixpanel - Initialize',
          stopOnSetupFailure: false,
        },
      ],
    });
    expect(findParameter(mixpanelRouteSearchTag.parameter, 'html').value).toContain(
      "window.mixpanel.track('route_search'",
    );
  });

  it('sends route_save and route_share dataLayer events to both analytics destinations', () => {
    const tags = importConfig.containerVersion.tag;
    const triggers = importConfig.containerVersion.trigger;
    const routeSaveTrigger = triggers.find((trigger) => trigger.name === 'Custom Event - route_save');
    const routeShareTrigger = triggers.find((trigger) => trigger.name === 'Custom Event - route_share');
    const ga4RouteSaveTag = tags.find((tag) => tag.name === 'GA4 - Event - route_save');
    const ga4RouteShareTag = tags.find((tag) => tag.name === 'GA4 - Event - route_share');
    const mixpanelRouteSaveTag = tags.find((tag) => tag.name === 'Mixpanel - Event - route_save');
    const mixpanelRouteShareTag = tags.find((tag) => tag.name === 'Mixpanel - Event - route_share');

    expect(routeSaveTrigger.customEventFilter[0].parameter[1].value).toBe('route_save');
    expect(routeShareTrigger.customEventFilter[0].parameter[1].value).toBe('route_share');
    expect(ga4RouteSaveTag.firingTriggerId).toEqual([routeSaveTrigger.triggerId]);
    expect(ga4RouteShareTag.firingTriggerId).toEqual([routeShareTrigger.triggerId]);
    expect(findParameter(ga4RouteSaveTag.parameter, 'eventName').value).toBe('route_save');
    expect(findParameter(ga4RouteShareTag.parameter, 'eventName').value).toBe('route_share');
    expect(findParameter(mixpanelRouteSaveTag.parameter, 'html').value).toContain(
      "window.mixpanel.track('route_save'",
    );
    expect(findParameter(mixpanelRouteShareTag.parameter, 'html').value).toContain(
      "window.mixpanel.track('route_share'",
    );
  });

  it('captures growth dataLayer events with custom-event triggers and both analytics destinations', () => {
    const growthEvents = {
      landing_context: [
        'tab',
        'has_route_params',
        'has_share_utm',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referrer_type',
        'language',
      ],
      route_result_viewed: [
        'from',
        'to',
        'day_type',
        'results_count',
        'has_next_departure',
        'has_taxi_fallback',
        'source_context',
      ],
      route_no_direct_viewed: [
        'from',
        'to',
        'day_type',
        'has_transfer_suggestions',
        'has_taxi_fallback',
        'source_context',
      ],
      share_modal_opened: [
        'share_scope',
        'from',
        'to',
        'day_type',
      ],
      shared_route_opened: [
        'utm_source',
        'share_scope',
        'has_complete_route_state',
        'day_type',
      ],
      shared_route_restored: [
        'restore_status',
        'results_count',
        'selected_departure_restored',
      ],
      outbound_click: [
        'target_type',
        'context',
      ],
      browse_interaction: [
        'browse_action',
        'mode',
        'query_present',
      ],
    };

    for (const [eventName, expectedParameters] of Object.entries(growthEvents)) {
      const trigger = customEventTrigger(eventName);
      const ga4Tag = eventTag('GA4', eventName);
      const mixpanelTag = eventTag('Mixpanel', eventName);

      expect(trigger).toMatchObject({
        type: 'CUSTOM_EVENT',
      });
      expect(trigger.customEventFilter[0].parameter[1].value).toBe(eventName);

      expect(ga4Tag).toMatchObject({
        type: 'gaawe',
        firingTriggerId: [trigger.triggerId],
      });
      expect(findParameter(ga4Tag.parameter, 'eventName').value).toBe(eventName);
      expect(findParameter(ga4Tag.parameter, 'measurementIdOverride').value).toBe(
        '{{Riviera Dei Fiori Route Finder - GA4 Measurement ID}}',
      );
      const ga4EventParameters = findParameter(ga4Tag.parameter, 'eventSettingsTable')
        .list.map((entry) => entry.map.find((item) => item.key === 'parameter').value);
      expect(ga4EventParameters).toEqual(expectedParameters);

      expect(mixpanelTag).toMatchObject({
        type: 'html',
        firingTriggerId: [trigger.triggerId],
        setupTag: [
          {
            tagName: 'Mixpanel - Initialize',
            stopOnSetupFailure: false,
          },
        ],
      });
      expect(findParameter(mixpanelTag.parameter, 'html').value).toContain(
        `window.mixpanel.track('${eventName}'`,
      );
      for (const parameterName of expectedParameters) {
        expect(findParameter(mixpanelTag.parameter, 'html').value).toContain(`${parameterName}:`);
      }
    }
  });
});
