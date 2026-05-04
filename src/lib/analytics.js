export function pushRouteSearchEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
}) {
  windowObject.dataLayer = windowObject.dataLayer || [];
  windowObject.dataLayer.push({
    event: 'route_search',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    no_results: resultsCount === 0,
  });
}
