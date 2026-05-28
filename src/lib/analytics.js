function ensureDataLayer(windowObject) {
  windowObject.dataLayer = windowObject.dataLayer || [];
  return windowObject.dataLayer;
}

export function pushRouteSearchEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_search',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    no_results: resultsCount === 0,
  });
}

export function pushRouteSaveEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  saveStatus,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_save',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    save_status: saveStatus,
  });
}

export function pushRouteShareEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  shareMethod,
  shareUrl,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_share',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    share_method: shareMethod,
    share_url: shareUrl,
  });
}

export function pushLandingContextEvent(windowObject, {
  tab,
  hasRouteParams,
  hasShareUtm,
  utmSource = '',
  utmMedium = '',
  utmCampaign = '',
  referrerType = 'unknown',
  language,
}) {
  ensureDataLayer(windowObject).push({
    event: 'landing_context',
    tab,
    has_route_params: Boolean(hasRouteParams),
    has_share_utm: Boolean(hasShareUtm),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    referrer_type: referrerType,
    language,
  });
}

export function pushRouteResultViewedEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  hasNextDeparture,
  hasTaxiFallback,
  sourceContext = 'unknown',
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_result_viewed',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    has_next_departure: Boolean(hasNextDeparture),
    has_taxi_fallback: Boolean(hasTaxiFallback),
    source_context: sourceContext,
  });
}

export function pushRouteNoDirectViewedEvent(windowObject, {
  from,
  to,
  dayType,
  hasTransferSuggestions,
  hasTaxiFallback,
  sourceContext = 'unknown',
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_no_direct_viewed',
    from,
    to,
    day_type: dayType,
    has_transfer_suggestions: Boolean(hasTransferSuggestions),
    has_taxi_fallback: Boolean(hasTaxiFallback),
    source_context: sourceContext,
  });
}

export function pushShareModalOpenedEvent(windowObject, {
  shareScope,
  from,
  to,
  dayType,
}) {
  ensureDataLayer(windowObject).push({
    event: 'share_modal_opened',
    share_scope: shareScope,
    from,
    to,
    day_type: dayType,
  });
}

export function pushSharedRouteOpenedEvent(windowObject, {
  utmSource = '',
  shareScope = 'route',
  hasCompleteRouteState,
  dayType,
}) {
  ensureDataLayer(windowObject).push({
    event: 'shared_route_opened',
    utm_source: utmSource,
    share_scope: shareScope,
    has_complete_route_state: Boolean(hasCompleteRouteState),
    day_type: dayType,
  });
}

export function pushSharedRouteRestoredEvent(windowObject, {
  restoreStatus,
  resultsCount = 0,
  selectedDepartureRestored = false,
}) {
  ensureDataLayer(windowObject).push({
    event: 'shared_route_restored',
    restore_status: restoreStatus,
    results_count: resultsCount,
    selected_departure_restored: Boolean(selectedDepartureRestored),
  });
}

export function pushOutboundClickEvent(windowObject, {
  targetType,
  context,
}) {
  ensureDataLayer(windowObject).push({
    event: 'outbound_click',
    target_type: targetType,
    context,
  });
}

export function pushBrowseInteractionEvent(windowObject, {
  browseAction,
  mode,
  queryPresent,
}) {
  ensureDataLayer(windowObject).push({
    event: 'browse_interaction',
    browse_action: browseAction,
    mode,
    query_present: Boolean(queryPresent),
  });
}
