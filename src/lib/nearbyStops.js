import { matchProviderStopName } from './normalize.js';

export function createNearbyStopCacheKey(latitude, longitude) {
  return `${latitude.toFixed(3)}|${longitude.toFixed(3)}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceBetweenMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    (Math.sin(latitudeDelta / 2) ** 2) +
    (Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * (Math.sin(longitudeDelta / 2) ** 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c);
}

export async function fetchOverpassNearbyStops(
  { latitude, longitude },
  { radiusMeters = 1200 } = {},
) {
  const query = `
[out:json][timeout:25];
(
  node(around:${radiusMeters},${latitude},${longitude})["highway"="bus_stop"];
  node(around:${radiusMeters},${latitude},${longitude})["public_transport"~"platform|stop_position"];
  way(around:${radiusMeters},${latitude},${longitude})["public_transport"="platform"];
  relation(around:${radiusMeters},${latitude},${longitude})["public_transport"="platform"];
);
out center 20;
  `.trim();

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Nearby stop lookup failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  return (payload.elements ?? [])
    .map((element) => {
      const point = 'lat' in element
        ? { latitude: element.lat, longitude: element.lon }
        : element.center
          ? { latitude: element.center.lat, longitude: element.center.lon }
          : null;

      const label = element.tags?.name?.trim();

      if (!point || !label) {
        return null;
      }

      return {
        label,
        distanceMeters: distanceBetweenMeters(
          { latitude, longitude },
          point,
        ),
        lat: point.latitude,
        lon: point.longitude,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

export async function buildNearbyStopChoices({
  latitude,
  longitude,
  stops,
  aliases,
  fetchNearbyStops,
  limit = 5,
}) {
  const providerResults = await fetchNearbyStops({ latitude, longitude });
  const stopMap = new Map(stops.map((stop) => [stop.canonical, stop]));

  return providerResults
    .map((result) => {
      const canonical = matchProviderStopName(result.label, aliases);
      const stop = stopMap.get(canonical);

      if (!stop) {
        return null;
      }

      return {
        stopId: stop.id,
        canonical: stop.canonical,
        label: result.label,
        distanceMeters: result.distanceMeters,
        latitude: result.lat,
        longitude: result.lon,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
}
