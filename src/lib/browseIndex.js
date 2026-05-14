function compareLineIds(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function stopLabel(stopId, stopsById, fallbackName = '') {
  return stopsById.get(stopId)?.canonical ?? fallbackName ?? stopId;
}

export function buildBrowseIndex({ trips = [], stops = [] } = {}) {
  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const lineGroups = new Map();
  const stopGroups = new Map();

  for (const trip of trips) {
    const lineId = trip.lineId;

    if (!lineId) {
      continue;
    }

    if (!lineGroups.has(lineId)) {
      lineGroups.set(lineId, {
        lineId,
        directions: new Set(),
        stops: [],
        stopIds: new Set(),
      });
    }

    const lineGroup = lineGroups.get(lineId);

    if (trip.direction) {
      lineGroup.directions.add(trip.direction);
    }

    for (const tripStop of trip.stops ?? []) {
      const stopId = tripStop.stopId;

      if (!stopId) {
        continue;
      }

      if (!lineGroup.stopIds.has(stopId)) {
        lineGroup.stopIds.add(stopId);
        lineGroup.stops.push({
          id: stopId,
          canonical: stopLabel(stopId, stopsById, tripStop.name),
        });
      }

      if (!stopGroups.has(stopId)) {
        stopGroups.set(stopId, {
          id: stopId,
          canonical: stopLabel(stopId, stopsById, tripStop.name),
          lines: new Set(),
        });
      }

      stopGroups.get(stopId).lines.add(lineId);
    }
  }

  const lines = [...lineGroups.values()]
    .sort((left, right) => compareLineIds(left.lineId, right.lineId))
    .map((line) => ({
      lineId: line.lineId,
      directions: [...line.directions].sort(compareText),
      stops: line.stops,
    }));

  const servedStopIds = new Set(stopGroups.keys());
  const uniqueStops = new Map(stops.filter((stop) => servedStopIds.has(stop.id)).map((stop) => [stop.id, stop]));
  const stopsIndex = [...uniqueStops.values()]
    .map((stop) => ({
      id: stop.id,
      canonical: stop.canonical,
      lines: [...stopGroups.get(stop.id).lines].sort(compareLineIds),
    }));

  return { lines, stops: stopsIndex };
}
