const OSRM_ROUTE_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

function hasCoordinate(point) {
  return Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude);
}

export function buildStreetRouteGeometryKey(points = []) {
  return points
    .filter(hasCoordinate)
    .map((point) => `${point.stopId ?? ''}:${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`)
    .join('|');
}

export function buildOsrmRouteUrl(points = []) {
  const coordinates = points
    .filter(hasCoordinate)
    .map((point) => `${point.longitude},${point.latitude}`);

  if (coordinates.length < 2) {
    return null;
  }

  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    continue_straight: 'false',
  });

  return `${OSRM_ROUTE_BASE_URL}/${coordinates.join(';')}?${params.toString()}`;
}

export function decodeOsrmRouteGeometry(payload) {
  const coordinates = payload?.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    .map(([longitude, latitude]) => [latitude, longitude]);
}

export async function fetchStreetRouteGeometry(points = [], { fetchImpl = globalThis.fetch } = {}) {
  const url = buildOsrmRouteUrl(points);

  if (!url || typeof fetchImpl !== 'function') {
    return [];
  }

  try {
    const response = await fetchImpl(url);

    if (!response?.ok) {
      return [];
    }

    return decodeOsrmRouteGeometry(await response.json());
  } catch {
    return [];
  }
}
