function isUsableCoordinate(coords) {
  return Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude);
}

function isUsableGeometryPoint(point) {
  return Array.isArray(point)
    && point.length === 2
    && Number.isFinite(point[0])
    && Number.isFinite(point[1]);
}

function normalizeRouteGeometry(routeGeometry = []) {
  if (!Array.isArray(routeGeometry)) {
    return [];
  }

  return routeGeometry.filter(isUsableGeometryPoint);
}

export function buildRouteMapState(match, stopCoordinates = {}, {
  mapLoadFailed = false,
  routeGeometry = [],
} = {}) {
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
  const stopSegmentGeometry = points.map((point) => [point.latitude, point.longitude]);
  const streetGeometry = normalizeRouteGeometry(routeGeometry);
  const hasStreetGeometry = streetGeometry.length >= 2;

  return {
    hasMap: mapStatus === 'ready' || mapStatus === 'partial',
    mapStatus,
    geometryStatus: hasStreetGeometry ? 'street-estimate' : coordinateStatus === 'unavailable' ? 'unavailable' : 'stop-segment',
    geometryPoints: hasStreetGeometry ? streetGeometry : stopSegmentGeometry,
    stops,
    points,
    missingStopIds,
  };
}
