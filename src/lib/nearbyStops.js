import { matchProviderStopName } from './normalize.js';

export function createNearbyStopCacheKey(latitude, longitude) {
  return `${latitude.toFixed(3)}|${longitude.toFixed(3)}`;
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
