import { normalizeText } from './normalize.js';

export function findMatchingLocalities(query, localities) {
  const normalizedQuery = normalizeText(query);

  return localities.filter((locality) =>
    locality.matchTokens.some((token) => token.includes(normalizedQuery)),
  );
}

export function getLocalityStops(localityId, localities, stops) {
  const locality = localities.find((entry) => entry.id === localityId);

  if (!locality) {
    return [];
  }

  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  return locality.stopIds.map((stopId) => stopMap.get(stopId)).filter(Boolean);
}

export function getReachableStops(fromStopId, reachability, stops) {
  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  return (reachability[fromStopId] ?? []).map((stopId) => stopMap.get(stopId)).filter(Boolean);
}
