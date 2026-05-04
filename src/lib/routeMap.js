export function buildRouteMapState(match, stopCoordinates = {}) {
  const stops = match.segmentStops.map((stop) => ({
    stopId: stop.stopId,
    label: stop.name,
    time: stop.time,
  }));
  const points = stops
    .map((stop) => {
      const coords = stopCoordinates[stop.stopId];
      return coords
        ? { ...stop, latitude: coords.latitude, longitude: coords.longitude }
        : null;
    })
    .filter(Boolean);
  const missingStopIds = stops
    .filter((stop) => !stopCoordinates[stop.stopId])
    .map((stop) => stop.stopId);

  return {
    hasMap: missingStopIds.length === 0 && points.length >= 2,
    stops,
    points,
    missingStopIds,
  };
}
