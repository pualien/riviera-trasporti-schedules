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
