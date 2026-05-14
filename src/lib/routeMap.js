function isUsableCoordinate(coords) {
  return Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude);
}

export function buildRouteMapState(match, stopCoordinates = {}, { mapLoadFailed = false } = {}) {
  const stops = match.segmentStops.map((stop) => ({
    stopId: stop.stopId,
    label: stop.name,
    time: stop.time,
  }));

  const points = stops
    .map((stop) => {
      const coords = stopCoordinates[stop.stopId];
      return isUsableCoordinate(coords)
        ? { ...stop, latitude: coords.latitude, longitude: coords.longitude }
        : null;
    })
    .filter(Boolean);

  const missingStopIds = stops
    .filter((stop) => !isUsableCoordinate(stopCoordinates[stop.stopId]))
    .map((stop) => stop.stopId);

  const coordinateStatus = points.length >= 2
    ? (missingStopIds.length ? 'partial' : 'ready')
    : 'unavailable';
  const mapStatus = mapLoadFailed && points.length >= 2
    ? 'load-failed'
    : coordinateStatus;

  return {
    hasMap: mapStatus === 'ready' || mapStatus === 'partial',
    mapStatus,
    stops,
    points,
    missingStopIds,
  };
}
